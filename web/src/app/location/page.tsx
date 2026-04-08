"use client";

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { fetchNetwork, fetchUsers, NetworkNode, NetworkEdge, NetworkResponse, fetchAssets, SystemUser, AssetMeta } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useDeviceType } from "@/hooks/useDeviceType";

// ─── Node dimensions ──────────────────────────────────────────────────────────
const NODE_W = 168;
const NODE_H = 68;

// Cluster layout constants
const CLUSTER_COLS   = 3;    // max nodes per row inside a cluster
const NODE_H_GAP     = 18;   // horizontal gap between nodes inside cluster
const NODE_V_GAP     = 18;   // vertical gap between nodes inside cluster
const CL_PAD_X       = 24;   // horizontal padding inside cluster
const CL_PAD_TOP     = 46;   // top padding (space for cluster label)
const CL_PAD_BOT     = 22;   // bottom padding
const CL_GAP         = 56;   // gap between clusters
const ROW_MAX_W      = 1900; // max cluster-row width before wrapping
const CANVAS_PAD     = 64;   // canvas edge padding

// Sub-cluster (floor/zone split inside building)
const SUBCL_PAD_TOP  = 34;
const SUBCL_PAD_X    = 14;
const SUBCL_PAD_BOT  = 12;
const SUBCL_GAP      = 14;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlacedNode extends NetworkNode {
  x: number;
  y: number;
}

interface ClusterRect {
  key: string;
  label: string;
  sublabel?: string;
  x: number; y: number; w: number; h: number;
  level: "building" | "floor";
  colorIdx: number;
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const CL_FILL   = ["rgba(96,165,250,0.07)","rgba(167,139,250,0.07)","rgba(52,211,153,0.07)","rgba(251,146,60,0.07)","rgba(56,189,248,0.07)","rgba(244,114,182,0.07)"];
const CL_STROKE = ["rgba(96,165,250,0.3)","rgba(167,139,250,0.3)","rgba(52,211,153,0.3)","rgba(251,146,60,0.3)","rgba(56,189,248,0.3)","rgba(244,114,182,0.3)"];
const SUB_FILL  = "rgba(255,255,255,0.03)";
const SUB_STROKE= "rgba(255,255,255,0.1)";

const STATE_COLOR: Record<string, string> = {
  NORMAL: "#10b981", WARNING: "#eab308", CRITICAL: "#ef4444", IMPACTED: "#f97316",
};
const TYPE_ACCENT: Record<string, string> = {
  SOURCE: "#60a5fa", TRANSFORMER: "#a78bfa", PANEL: "#fb923c",
  MOTOR: "#34d399", LOAD: "#f472b6", HVAC: "#38bdf8", DISTRIBUTION: "#fb923c",
};

// ─── Layout builder ───────────────────────────────────────────────────────────
/**
 * Groups nodes by Building → Floor/Zone, then packs each sub-group into a grid.
 * Returns per-node positions and cluster rectangles for rendering.
 */
function buildLocationLayout(nodes: NetworkNode[]): { placed: PlacedNode[]; clusters: ClusterRect[] } {
  if (!nodes.length) return { placed: [], clusters: [] };

  // Group: building → floor → nodes
  const buildingMap = new Map<string, Map<string, NetworkNode[]>>();
  nodes.forEach(n => {
    const bld = n.building || n.site || "Unassigned";
    const flr = n.floor || n.zone || "General";
    if (!buildingMap.has(bld)) buildingMap.set(bld, new Map());
    const sub = buildingMap.get(bld)!;
    if (!sub.has(flr)) sub.set(flr, []);
    sub.get(flr)!.push(n);
  });

  const placed: PlacedNode[] = [];
  const clusters: ClusterRect[] = [];
  let bldColorIdx = 0;

  let cursorX = CANVAS_PAD;
  let cursorY = CANVAS_PAD;
  let rowMaxH = 0;

  buildingMap.forEach((floorMap, bldKey) => {
    // First: compute total height of this building cluster (all sub-clusters stacked)
    let bldInnerW = 0;
    let bldInnerH = 0;
    const subLayouts: { flrKey: string; w: number; h: number; nodes: NetworkNode[] }[] = [];

    floorMap.forEach((fnodes, flrKey) => {
      const cols = Math.min(CLUSTER_COLS, fnodes.length);
      const rows = Math.ceil(fnodes.length / cols);
      const iw   = cols * NODE_W + (cols - 1) * NODE_H_GAP;
      const ih   = rows * NODE_H + (rows - 1) * NODE_V_GAP;
      const sw   = iw + SUBCL_PAD_X * 2;
      const sh   = ih + SUBCL_PAD_TOP + SUBCL_PAD_BOT;
      bldInnerW   = Math.max(bldInnerW, sw);
      subLayouts.push({ flrKey, w: sw, h: sh, nodes: fnodes });
    });

    bldInnerH = subLayouts.reduce((acc, s) => acc + s.h, 0) + (subLayouts.length - 1) * SUBCL_GAP;
    const bldW = bldInnerW + CL_PAD_X * 2;
    const bldH = bldInnerH + CL_PAD_TOP + CL_PAD_BOT;

    // Row wrap logic
    if (clusters.length > 0 && cursorX + bldW > CANVAS_PAD + ROW_MAX_W) {
      cursorY += rowMaxH + CL_GAP;
      cursorX  = CANVAS_PAD;
      rowMaxH  = 0;
    }

    const bldX = cursorX;
    const bldY = cursorY;

    // Building cluster rect
    clusters.push({
      key: bldKey, label: bldKey, level: "building",
      x: bldX, y: bldY, w: bldW, h: bldH, colorIdx: bldColorIdx,
    });

    // Sub-cluster (floor/zone) layout — stacked vertically inside building
    let subY = bldY + CL_PAD_TOP;
    subLayouts.forEach(sub => {
      const subX = bldX + CL_PAD_X;

      clusters.push({
        key: `${bldKey}::${sub.flrKey}`, label: sub.flrKey, sublabel: bldKey,
        level: "floor", x: subX, y: subY, w: sub.w, h: sub.h, colorIdx: bldColorIdx,
      });

      // Position nodes inside sub-cluster
      const cols = Math.min(CLUSTER_COLS, sub.nodes.length);
      sub.nodes.forEach((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        placed.push({
          ...n,
          x: subX + SUBCL_PAD_X + col * (NODE_W + NODE_H_GAP),
          y: subY + SUBCL_PAD_TOP + row * (NODE_H + NODE_V_GAP),
        });
      });

      subY += sub.h + SUBCL_GAP;
    });

    rowMaxH = Math.max(rowMaxH, bldH);
    cursorX += bldW + CL_GAP;
    bldColorIdx++;
  });

  return { placed, clusters };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LocationPage() {
  const router = useRouter();

  const [network,   setNetwork]   = useState<NetworkResponse | null>(null);
  const [placed,    setPlaced]    = useState<PlacedNode[]>([]);
  const [clusters,  setClusters]  = useState<ClusterRect[]>([]);
  const [posMap,    setPosMap]    = useState<Map<string, { x: number; y: number }>>(new Map());
  const [error,     setError]     = useState("");
  const [role,      setRole]      = useState("admin");
  const [users,     setUsers]     = useState<{ id: number; username: string; role: string }[]>([]);
  const [selOwner,  setSelOwner]  = useState<number | undefined>(undefined);
  const { isMobile } = useDeviceType();
  const [showFilters, setShowFilters] = useState(false);

  // Interaction
  const [selected,  setSelected]  = useState<string | null>(null);
  const [hovered,   setHovered]   = useState<string | null>(null);

  // Drag
  const dragRef = useRef<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null);

  // Pan / zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const panRef = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  // Filters
  const [search,         setSearch]         = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterFloor,    setFilterFloor]    = useState("");
  const [filterType,     setFilterType]     = useState("");

  // ─── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    const r = localStorage.getItem("role") || "admin";
    setRole(r);
    if (r === "superadmin") fetchUsers().then(setUsers).catch(() => {});

    fetchNetwork(selOwner)
      .then(data => {
        setNetwork(data);
        const { placed: lp, clusters: cl } = buildLocationLayout(data.nodes);
        setPlaced(lp);
        setClusters(cl);
        setPosMap(new Map(lp.map(n => [n.id, { x: n.x, y: n.y }])));
      })
      .catch(() => setError("Failed to load network."));
  }, [router, selOwner]);

  const edges = network?.edges ?? [];

  // ─── Graph traversal ───────────────────────────────────────────────────────
  const upstream = useMemo<Set<string>>(() => {
    if (!selected) return new Set();
    const vis = new Set<string>(); const q = [selected];
    while (q.length) {
      const cur = q.shift()!;
      edges.forEach(e => { if (e.child_asset_id === cur && !vis.has(e.parent_asset_id)) { vis.add(e.parent_asset_id); q.push(e.parent_asset_id); } });
    }
    return vis;
  }, [selected, edges]);

  const downstream = useMemo<Set<string>>(() => {
    if (!selected) return new Set();
    const vis = new Set<string>(); const q = [selected];
    while (q.length) {
      const cur = q.shift()!;
      edges.forEach(e => { if (e.parent_asset_id === cur && !vis.has(e.child_asset_id)) { vis.add(e.child_asset_id); q.push(e.child_asset_id); } });
    }
    return vis;
  }, [selected, edges]);

  // ─── Filter ────────────────────────────────────────────────────────────────
  const isVisible = useCallback((n: PlacedNode) => {
    const bld = n.building || n.site || "Unassigned";
    const flr = n.floor || n.zone || "General";
    if (search         && !n.id.toLowerCase().includes(search.toLowerCase()) && !n.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterBuilding && bld !== filterBuilding) return false;
    if (filterFloor    && flr !== filterFloor)    return false;
    if (filterType     && n.asset_type !== filterType) return false;
    return true;
  }, [search, filterBuilding, filterFloor, filterType]);

  // ─── Drag ──────────────────────────────────────────────────────────────────
  const onNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const p = posMap.get(id) || { x: 0, y: 0 };
    dragRef.current = { id, ox: p.x, oy: p.y, sx: e.clientX, sy: e.clientY };
  }, [posMap]);

  const onSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) {
      const { id, ox, oy, sx, sy } = dragRef.current;
      setPosMap(prev => new Map(prev).set(id, {
        x: ox + (e.clientX - sx) / transform.scale,
        y: oy + (e.clientY - sy) / transform.scale,
      }));
      return;
    }
    if (panRef.current) {
      const { sx, sy, tx, ty } = panRef.current;
      setTransform(t => ({ ...t, x: tx + (e.clientX - sx), y: ty + (e.clientY - sy) }));
    }
  }, [transform.scale]);

  const onSvgMouseUp   = useCallback(() => { dragRef.current = null; panRef.current = null; }, []);
  const onSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).classList.contains("bg-rect"))
      panRef.current = { sx: e.clientX, sy: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform(t => ({ ...t, scale: Math.min(3, Math.max(0.15, t.scale * (e.deltaY > 0 ? 0.9 : 1.1))) }));
  }, []);

  // ─── Derived filter options ────────────────────────────────────────────────
  const buildings = useMemo(() => [...new Set(placed.map(n => n.building || n.site || "Unassigned"))], [placed]);
  const floors    = useMemo(() => [...new Set(placed.filter(n => !filterBuilding || (n.building || n.site || "Unassigned") === filterBuilding).map(n => n.floor || n.zone || "General"))], [placed, filterBuilding]);
  const types     = useMemo(() => [...new Set(placed.map(n => n.asset_type).filter(Boolean))] as string[], [placed]);

  const hovNode = hovered  ? placed.find(n => n.id === hovered)  : null;
  const selNode = selected ? placed.find(n => n.id === selected) : null;

  if (!network) {
    return (
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          {error ? <p style={{ color: "var(--urgent)" }}>{error}</p> : <p>Loading location map…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 0, display: "flex", flexDirection: "column", height: "100vh", paddingBottom: isMobile ? '6rem' : '2rem' }}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="header" style={{ 
        padding: '0.5rem 0', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '2rem'
      }}>
        <div className="title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo height={isMobile ? "60px" : "100px"} />
          <span style={{ fontSize: '1.5rem', fontWeight: 400, opacity: 0.8 }}>Strategic Locations</span>
          {role === "superadmin" && !isMobile && (
            <span style={{ fontSize: "0.68rem", padding: "0.18rem 0.55rem", borderRadius: 20, background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308", fontWeight: 700 }}>
              SUPERADMIN
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginLeft: "auto" }}>
          {isMobile ? (
            <button onClick={() => setShowFilters(!showFilters)} className="status-badge" style={{ padding: '0.4rem 0.8rem' }}>
              {showFilters ? "✕ Close" : "📍 Filters"}
            </button>
          ) : (
            <>
              {role === "superadmin" && users.length > 0 && (
                <select value={selOwner ?? ""} onChange={e => setSelOwner(e.target.value ? Number(e.target.value) : undefined)}
                  style={{ fontSize: "0.80rem", padding: "0.4rem 0.65rem", minWidth: 170 }}>
                  <option value="">All Networks</option>
                  {users.filter(u => u.role === "admin").map(u => (
                    <option key={u.id} value={u.id}>{u.username}'s Network</option>
                  ))}
                </select>
              )}
            </>
          )}
          <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            className="status-badge" style={{ cursor: "pointer", fontSize: "0.78rem", display: isMobile ? 'none' : 'block' }}>↺ Reset</button>
          <button onClick={() => router.push("/network")}
            className="status-badge" style={{ cursor: "pointer", fontSize: isMobile ? '0.7rem' : '0.9rem' }}>⬡ Topology</button>
          <button onClick={() => router.push("/")}
            className="status-badge" style={{ cursor: "pointer", background: "transparent", fontSize: isMobile ? '0.7rem' : '0.9rem' }}>
            {isMobile ? "Back" : "Dashboard"}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {(showFilters || !isMobile) && (
          <div className="glass-panel" style={{
            width: isMobile ? '100%' : 196, 
            position: isMobile ? 'absolute' : 'relative',
            zIndex: 50,
            height: isMobile ? 'auto' : '100%',
            maxHeight: isMobile ? '60%' : 'none',
            flexShrink: 0, overflowY: "auto",
            padding: "0.85rem",
          }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.5, letterSpacing: "0.08em", marginBottom: "0.6rem" }}>FILTERS</div>

            {[
              { label: "Search", isText: true },
              { label: "Building / Site", val: filterBuilding, set: setFilterBuilding, opts: buildings },
              { label: "Floor / Zone",    val: filterFloor,    set: setFilterFloor,    opts: floors    },
              { label: "Asset Type",      val: filterType,     set: setFilterType,     opts: types     },
            ].map(f => (
              <div className="control-group" key={f.label} style={{ marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.72rem" }}>{f.label}</label>
                {f.isText
                  ? <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or ID…" style={{ fontSize: "0.76rem", padding: "0.35rem 0.55rem" }} />
                  : <select value={f.val} onChange={e => f.set!(e.target.value)} style={{ fontSize: "0.76rem", padding: "0.35rem 0.55rem" }}>
                      <option value="">All</option>
                      {(f.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                }
              </div>
            ))}

            <button onClick={() => { setSearch(""); setFilterBuilding(""); setFilterFloor(""); setFilterType(""); setSelected(null); setShowFilters(false); }}
              className="status-badge" style={{ width: "100%", cursor: "pointer", background: "transparent", textAlign: "center", fontSize: "0.72rem" }}>
              Reset Filters
            </button>

            {/* Legend */}
            {!isMobile && (
              <>
                <div style={{ marginTop: "1rem", fontSize: "0.71rem", opacity: 0.55 }}>
                  <div style={{ fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.3rem" }}>STATE</div>
                  {Object.entries(STATE_COLOR).map(([s, c]) => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />{s}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "0.85rem", fontSize: "0.71rem", opacity: 0.55 }}>
                  <div style={{ fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.3rem" }}>TYPE</div>
                  {Object.entries(TYPE_ACCENT).map(([t, c]) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                      <div style={{ width: 8, height: 4, borderRadius: 2, background: c }} />{t}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── SVG Canvas ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <svg
            width="100%" height="100%"
            style={{ fontFamily: "inherit", cursor: "grab" }}
            onMouseMove={onSvgMouseMove}
            onMouseUp={onSvgMouseUp}
            onMouseLeave={onSvgMouseUp}
            onMouseDown={onSvgMouseDown}
            onWheel={onWheel}
          >
            <defs>
              <marker id="arr-loc" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="rgba(255,255,255,0.28)" />
              </marker>
              <marker id="arr-loc-hi" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="rgba(255,255,255,0.9)" />
              </marker>
            </defs>

            <rect className="bg-rect" x={0} y={0} width="100%" height="100%" fill="transparent" />

            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>

              {/* ── Building clusters (bottom layer) ─────────────────────── */}
              {clusters.filter(c => c.level === "building").map(c => {
                const anyVisible = placed.filter(n => (n.building || n.site || "Unassigned") === c.key).some(isVisible);
                return (
                  <g key={c.key} opacity={(filterBuilding || filterFloor || filterType || search) && !anyVisible ? 0.12 : 1} style={{ transition: "opacity 0.2s" }}>
                    <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={18} ry={18}
                      fill={CL_FILL[c.colorIdx % CL_FILL.length]}
                      stroke={CL_STROKE[c.colorIdx % CL_STROKE.length]} strokeWidth={1.5}
                    />
                    {/* Building label */}
                    <text x={c.x + CL_PAD_X} y={c.y + 28}
                      fill={CL_STROKE[c.colorIdx % CL_STROKE.length]} fontSize={13} fontWeight={700}>
                      🏢 {c.label}
                    </text>
                  </g>
                );
              })}

              {/* ── Sub-clusters: floor / zone (middle layer) ─────────────── */}
              {clusters.filter(c => c.level === "floor").map(c => {
                const bld = c.sublabel!;
                const anyVisible = placed.filter(n => (n.building || n.site || "Unassigned") === bld && (n.floor || n.zone || "General") === c.label).some(isVisible);
                return (
                  <g key={c.key} opacity={(filterBuilding || filterFloor || filterType || search) && !anyVisible ? 0.1 : 0.95} style={{ transition: "opacity 0.2s" }}>
                    <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={12} ry={12}
                      fill={SUB_FILL} stroke={SUB_STROKE} strokeWidth={1} strokeDasharray="5,4"
                    />
                    <text x={c.x + SUBCL_PAD_X + 4} y={c.y + 22}
                      fill="rgba(255,255,255,0.4)" fontSize={10} fontWeight={600} letterSpacing={0.3}>
                      {c.label}
                    </text>
                  </g>
                );
              })}

              {/* ── Edges: elbow routing (above clusters, below nodes) ─────── */}
              {edges.map(edge => {
                const p = posMap.get(edge.parent_asset_id);
                const c = posMap.get(edge.child_asset_id);
                if (!p || !c) return null;

                const isOnPath = !!(selected && (
                  edge.parent_asset_id === selected || edge.child_asset_id === selected ||
                  (upstream.has(edge.parent_asset_id)   && upstream.has(edge.child_asset_id)) ||
                  (downstream.has(edge.parent_asset_id) && downstream.has(edge.child_asset_id))
                ));
                const dimmed = !!(selected && !isOnPath);

                // Elbow connector: right-exit → horizontal → vertical → left-enter
                const x1 = p.x + NODE_W; const y1 = p.y + NODE_H / 2;
                const x2 = c.x;          const y2 = c.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;

                return (
                  <path key={edge.id}
                    d={`M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`}
                    stroke={isOnPath ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.18)"}
                    strokeWidth={isOnPath ? 2.5 : 1.5}
                    fill="none" opacity={dimmed ? 0.06 : 1}
                    markerEnd={isOnPath ? "url(#arr-loc-hi)" : "url(#arr-loc)"}
                  />
                );
              })}

              {/* ── Nodes (top layer) ─────────────────────────────────────── */}
              {placed.map(node => {
                const pos        = posMap.get(node.id) || { x: node.x, y: node.y };
                const visible    = isVisible(node);
                const isSel      = node.id === selected;
                const isConn     = !!(selected && (upstream.has(node.id) || downstream.has(node.id)));
                const dimmed     = !!(selected && !isSel && !isConn);
                const stateCol   = STATE_COLOR[node.network_state || "NORMAL"] || STATE_COLOR.NORMAL;
                const typeAccent = TYPE_ACCENT[node.asset_type]  || "#fb923c";

                return (
                  <g key={node.id}
                    transform={`translate(${pos.x},${pos.y})`}
                    style={{ cursor: "grab", opacity: (!visible || dimmed) ? 0.12 : 1, transition: "opacity 0.15s" }}
                    onMouseDown={ev => onNodeMouseDown(ev, node.id)}
                    onClick={() => setSelected(isSel ? null : node.id)}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Drop shadow */}
                    <rect width={NODE_W} height={NODE_H} rx={14} ry={14}
                      fill="rgba(0,0,0,0.5)" transform="translate(3,4)" />
                    {/* Card */}
                    <rect width={NODE_W} height={NODE_H} rx={14} ry={14}
                      fill="rgba(14,5,2,0.85)"
                      stroke={isSel ? "#fff" : isConn ? stateCol : "rgba(255,255,255,0.16)"}
                      strokeWidth={isSel ? 2.2 : isConn ? 1.6 : 1}
                    />
                    {/* Type accent bar */}
                    <rect x={0} y={12} width={4} height={NODE_H - 24} rx={2} fill={typeAccent} opacity={0.9} />
                    {/* State dot */}
                    <circle cx={NODE_W - 14} cy={14} r={5.5} fill={stateCol} />
                    {/* Name */}
                    <text x={14} y={24} fill="#fff" fontSize={11} fontWeight={700} style={{ pointerEvents: "none" }}>
                      {node.name.length > 20 ? node.name.slice(0, 19) + "…" : node.name}
                    </text>
                    {/* ID */}
                    <text x={14} y={38} fill="rgba(255,255,255,0.48)" fontSize={9.5} style={{ pointerEvents: "none" }}>
                      {node.id}
                    </text>
                    {/* Zone context */}
                    <text x={14} y={52} fill="rgba(255,255,255,0.3)" fontSize={8.5} style={{ pointerEvents: "none" }}>
                      {[node.zone, node.panel].filter(Boolean).join(" · ") || node.asset_type}
                    </text>
                    {/* Load bar */}
                    {node.load_pct != null && (
                      <>
                        <rect x={14} y={60} width={NODE_W - 28} height={4} rx={2} fill="rgba(255,255,255,0.07)" />
                        <rect x={14} y={60}
                          width={Math.min(((node.load_pct ?? 0) / 100) * (NODE_W - 28), NODE_W - 28)}
                          height={4} rx={2} fill={stateCol} />
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* ── Hover Tooltip ────────────────────────────────────────────── */}
          {hovNode && (
            <div style={{
              position: "absolute", bottom: 20, right: 20,
              background: "rgba(6,2,1,0.97)", border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 14, padding: "0.85rem 1.1rem", fontSize: "0.78rem",
              maxWidth: 260, zIndex: 50, boxShadow: "0 8px 32px rgba(0,0,0,0.65)", pointerEvents: "none",
            }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.25rem", color: TYPE_ACCENT[hovNode.asset_type] || "#fff" }}>
                {hovNode.name}
              </div>
              <div style={{ opacity: 0.42, marginBottom: "0.5rem", fontSize: "0.71rem" }}>{hovNode.id} · {hovNode.asset_type}</div>
              <div style={{ display: "grid", gridTemplateColumns: "65px 1fr", gap: "2px 8px", opacity: 0.82 }}>
                <span style={{ opacity: 0.42 }}>Site</span>     <span>{hovNode.site || "—"}</span>
                <span style={{ opacity: 0.42 }}>Building</span> <span>{hovNode.building || "—"}</span>
                <span style={{ opacity: 0.42 }}>Floor</span>    <span>{hovNode.floor || "—"}</span>
                <span style={{ opacity: 0.42 }}>Zone</span>     <span>{hovNode.zone || "—"}</span>
                <span style={{ opacity: 0.42 }}>Panel</span>    <span>{hovNode.panel || "—"}</span>
              </div>
              {hovNode.load_pct != null && (
                <div style={{ marginTop: "0.5rem", padding: "0.3rem 0.5rem", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                  <span style={{ opacity: 0.42 }}>Load: </span>
                  <span style={{ color: STATE_COLOR[hovNode.network_state || "NORMAL"], fontWeight: 700 }}>{hovNode.load_pct}%</span>
                  <span style={{ opacity: 0.32, marginLeft: 5, fontSize: "0.68rem" }}>({hovNode.network_state})</span>
                </div>
              )}
              {selected && (upstream.has(hovNode.id) || downstream.has(hovNode.id)) && (
                <div style={{ marginTop: "0.35rem", fontSize: "0.68rem", opacity: 0.48 }}>
                  {upstream.has(hovNode.id) ? "⬆ Upstream" : "⬇ Downstream"}
                </div>
              )}
            </div>
          )}

          {/* ── Selected path bar ────────────────────────────────────────── */}
          {selNode && (
            <div style={{
              position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
              background: "rgba(6,2,1,0.96)", border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 28, padding: "0.32rem 1rem", fontSize: "0.77rem",
              zIndex: 50, display: "flex", alignItems: "center", gap: "0.6rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.55)",
            }}>
              <span style={{ color: TYPE_ACCENT[selNode.asset_type] || "#fff", fontWeight: 700 }}>{selNode.name}</span>
              <span style={{ opacity: 0.32 }}>|</span>
              <span style={{ opacity: 0.6 }}>⬆ {upstream.size} upstream</span>
              <span style={{ opacity: 0.32 }}>|</span>
              <span style={{ opacity: 0.6 }}>⬇ {downstream.size} downstream</span>
              <button onClick={() => setSelected(null)}
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "0.82rem" }}>✕</button>
            </div>
          )}

          {/* ── Bottom label ──────────────────────────────────────────────── */}
          <div style={{ position: "absolute", bottom: 20, left: 20, fontSize: "0.68rem", opacity: 0.3, pointerEvents: "none" }}>
            Location View · {clusters.filter(c => c.level === "building").length} buildings · {placed.length} assets
          </div>
        </div>
      </div>
    </div>
  );
}
