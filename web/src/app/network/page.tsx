"use client";

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { BottomNavigation } from "@/components/BottomNavigation";
import { fetchNetwork, fetchSystemUsers, NetworkNode, NetworkEdge, NetworkResponse, fetchAssets, SystemUser, AssetMeta } from "@/lib/api";
import { useDeviceType } from "@/hooks/useDeviceType";

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_W = 168;
const NODE_H = 68;
const H_GAP  = 240;
const V_GAP  = 140;
const PAD    = 80;

// Location view cluster constants
const CLUSTER_PAD_X  = 28;
const CLUSTER_PAD_TOP = 44;  // space for cluster label
const CLUSTER_PAD_BOT = 20;
const CLUSTER_GAP    = 60;
const LOC_H_GAP      = 20;   // gap between nodes within cluster
const LOC_V_GAP      = 20;
const LOC_COLS       = 3;    // max columns per cluster

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlacedNode extends NetworkNode {
  x: number;
  y: number;
  level: number;
}

interface ClusterRect {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

// ─── Topology layout: BFS hierarchical ───────────────────────────────────────
function buildTopologyLayout(nodes: NetworkNode[], edges: NetworkEdge[]): PlacedNode[] {
  if (!nodes.length) return [];
  const childrenOf = new Map<string, string[]>();
  const parentOf   = new Map<string, string>();
  edges.forEach(e => {
    if (!childrenOf.has(e.parent_asset_id)) childrenOf.set(e.parent_asset_id, []);
    childrenOf.get(e.parent_asset_id)!.push(e.child_asset_id);
    parentOf.set(e.child_asset_id, e.parent_asset_id);
  });

  const roots   = nodes.filter(n => !parentOf.has(n.id)).map(n => n.id);
  const levelOf = new Map<string, number>();
  const queue: { id: string; lv: number }[] = roots.map(id => ({ id, lv: 0 }));
  while (queue.length) {
    const { id, lv } = queue.shift()!;
    if (levelOf.has(id) && levelOf.get(id)! <= lv) continue;
    levelOf.set(id, lv);
    (childrenOf.get(id) || []).forEach(cid => queue.push({ id: cid, lv: lv + 1 }));
  }
  const maxLv = Math.max(...levelOf.values(), 0);
  nodes.forEach(n => { if (!levelOf.has(n.id)) levelOf.set(n.id, maxLv + 1); });

  const byLevel = new Map<number, string[]>();
  nodes.forEach(n => {
    const lv = levelOf.get(n.id)!;
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv)!.push(n.id);
  });

  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);
  sortedLevels.forEach((lv, li) => {
    if (li === 0) return;
    const ids = byLevel.get(lv)!;
    ids.sort((a, b) => {
      const pa = parentOf.get(a) ? (byLevel.get(lv - 1)?.indexOf(parentOf.get(a)!) ?? 99) : 99;
      const pb = parentOf.get(b) ? (byLevel.get(lv - 1)?.indexOf(parentOf.get(b)!) ?? 99) : 99;
      return pa - pb;
    });
  });

  const posOf = new Map<string, { x: number; y: number }>();
  sortedLevels.forEach(lv => {
    const ids = byLevel.get(lv)!;
    ids.forEach((id, i) => {
      posOf.set(id, { x: PAD + i * (NODE_W + H_GAP), y: PAD + lv * (NODE_H + V_GAP) });
    });
  });

  return nodes.map(n => ({
    ...n,
    x: posOf.get(n.id)?.x ?? PAD,
    y: posOf.get(n.id)?.y ?? PAD,
    level: levelOf.get(n.id) ?? 0,
  }));
}

// ─── Location layout: cluster by building ────────────────────────────────────
const CLUSTER_COLORS = [
  "rgba(96,165,250,0.06)", "rgba(167,139,250,0.06)", "rgba(52,211,153,0.06)",
  "rgba(251,146,60,0.06)", "rgba(56,189,248,0.06)", "rgba(244,114,182,0.06)",
];
const CLUSTER_BORDERS = [
  "rgba(96,165,250,0.25)", "rgba(167,139,250,0.25)", "rgba(52,211,153,0.25)",
  "rgba(251,146,60,0.25)", "rgba(56,189,248,0.25)", "rgba(244,114,182,0.25)",
];

function buildLocationLayout(nodes: NetworkNode[]): { placed: PlacedNode[]; clusters: ClusterRect[] } {
  if (!nodes.length) return { placed: [], clusters: [] };

  // Group by building (or site if no building)
  const groups = new Map<string, NetworkNode[]>();
  nodes.forEach(n => {
    const key = n.building || n.site || "Unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  });

  const placed: PlacedNode[] = [];
  const clusters: ClusterRect[] = [];

  let cursorX = PAD;
  let maxRowH = 0;
  let cursorY = PAD;
  let clusterIdx = 0;
  let rowStart = PAD;
  const ROW_MAX_W = 1800; // wrap clusters to next row after this width

  const groupEntries = [...groups.entries()];
  groupEntries.forEach(([key, groupNodes], gi) => {
    // Grid-pack nodes inside cluster
    const cols = Math.min(LOC_COLS, groupNodes.length);
    const rows = Math.ceil(groupNodes.length / cols);
    const innerW = cols * NODE_W + (cols - 1) * LOC_H_GAP;
    const innerH = rows * NODE_H + (rows - 1) * LOC_V_GAP;
    const clW = innerW + CLUSTER_PAD_X * 2;
    const clH = innerH + CLUSTER_PAD_TOP + CLUSTER_PAD_BOT;

    // Wrap to next row if needed
    if (gi > 0 && cursorX + clW > rowStart + ROW_MAX_W) {
      cursorY += maxRowH + CLUSTER_GAP;
      cursorX = PAD;
      maxRowH = 0;
    }

    const clX = cursorX;
    const clY = cursorY;

    // Position each node in the cluster grid
    groupNodes.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      placed.push({
        ...n,
        x: clX + CLUSTER_PAD_X + col * (NODE_W + LOC_H_GAP),
        y: clY + CLUSTER_PAD_TOP + row * (NODE_H + LOC_V_GAP),
        level: 0,
      });
    });

    clusters.push({
      key,
      label: key,
      x: clX, y: clY, w: clW, h: clH,
      color: CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length],
    });

    maxRowH = Math.max(maxRowH, clH);
    cursorX += clW + CLUSTER_GAP;
    clusterIdx++;
  });

  return { placed, clusters };
}

// ─── Color palettes ───────────────────────────────────────────────────────────
const STATE_COLOR: Record<string, string> = {
  NORMAL: "#10b981", WARNING: "#eab308", CRITICAL: "#ef4444", IMPACTED: "#f97316",
};
const TYPE_ACCENT: Record<string, string> = {
  SOURCE: "#60a5fa", TRANSFORMER: "#a78bfa", PANEL: "#fb923c",
  MOTOR: "#34d399", LOAD: "#f472b6", HVAC: "#38bdf8", DISTRIBUTION: "#fb923c",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function NetworkPage() {
  const router = useRouter();
  const { isMobile } = useDeviceType();
  const [showFilters, setShowFilters] = useState(false);

  const [network,    setNetwork]    = useState<NetworkResponse | null>(null);
  const [error,      setError]      = useState("");
  const [role,       setRole]       = useState("admin");
  const [users,      setUsers]      = useState<SystemUser[]>([]);
  const [selOwner,   setSelOwner]   = useState<number | undefined>(undefined);
  const [viewMode,   setViewMode]   = useState<"topology" | "location">("topology");

  // Topology layout state
  const [topoPlaced, setTopoPlaced] = useState<PlacedNode[]>([]);

  // Location layout state
  const [locPlaced,    setLocPlaced]    = useState<PlacedNode[]>([]);
  const [locClusters,  setLocClusters]  = useState<ClusterRect[]>([]);

  // Per-view drag positions
  const [topoPosMap, setTopoPosMap] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [locPosMap,  setLocPosMap]  = useState<Map<string, { x: number; y: number }>>(new Map());

  // Interaction
  const [selected,  setSelected]  = useState<string | null>(null);
  const [hovered,   setHovered]   = useState<string | null>(null);

  // Drag
  const dragRef = useRef<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null);

  // Pan/zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const panRef = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  // Filters
  const [search,         setSearch]         = useState("");
  const [filterSite,     setFilterSite]     = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterType,     setFilterType]     = useState("");

  // ─── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    const r = localStorage.getItem("userRole") || "admin";
    setRole(r);
    if (r === "superadmin") fetchSystemUsers().then(setUsers).catch(() => {});

    fetchNetwork(selOwner)
      .then(data => {
        setNetwork(data);
        // Build topology layout
        const tp = buildTopologyLayout(data.nodes, data.edges);
        setTopoPlaced(tp);
        setTopoPosMap(new Map(tp.map(n => [n.id, { x: n.x, y: n.y }])));
        // Build location layout
        const { placed: lp, clusters } = buildLocationLayout(data.nodes);
        setLocPlaced(lp);
        setLocClusters(clusters);
        setLocPosMap(new Map(lp.map(n => [n.id, { x: n.x, y: n.y }])));
      })
      .catch(() => setError("Failed to load network."));
  }, [router, selOwner]);

  // Reset view when switching modes
  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    setSelected(null);
  }, [viewMode]);

  // Active data for current view
  const placed = viewMode === "topology" ? topoPlaced : locPlaced;
  const posMap = viewMode === "topology" ? topoPosMap : locPosMap;
  const setPosMap = viewMode === "topology" ? setTopoPosMap : setLocPosMap;

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
    if (search) {
      const q = search.toLowerCase();
      return n.id.toLowerCase().includes(q) || n.name.toLowerCase().includes(q) || (n.panel || "").toLowerCase().includes(q);
    }
    if (filterSite     && n.site       !== filterSite)     return false;
    if (filterBuilding && n.building   !== filterBuilding) return false;
    if (filterType     && n.asset_type !== filterType)     return false;
    return true;
  }, [search, filterSite, filterBuilding, filterType]);

  // ─── Drag ──────────────────────────────────────────────────────────────────
  const onNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const pos = posMap.get(id) || { x: 0, y: 0 };
    dragRef.current = { id, ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY };
  }, [posMap]);

  const onSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) {
      const { id, ox, oy, sx, sy } = dragRef.current;
      const dx = (e.clientX - sx) / transform.scale;
      const dy = (e.clientY - sy) / transform.scale;
      setPosMap(prev => new Map(prev).set(id, { x: ox + dx, y: oy + dy }));
      return;
    }
    if (panRef.current) {
      const { sx, sy, tx, ty } = panRef.current;
      setTransform(t => ({ ...t, x: tx + (e.clientX - sx), y: ty + (e.clientY - sy) }));
    }
  }, [transform.scale, setPosMap]);

  const onSvgMouseUp = useCallback(() => { dragRef.current = null; panRef.current = null; }, []);
  const onSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).classList.contains("bg-rect")) {
      panRef.current = { sx: e.clientX, sy: e.clientY, tx: transform.x, ty: transform.y };
    }
  }, [transform]);
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform(t => ({ ...t, scale: Math.min(3, Math.max(0.15, t.scale * (e.deltaY > 0 ? 0.9 : 1.1))) }));
  }, []);

  // ─── Filter options ────────────────────────────────────────────────────────
  const sites      = useMemo(() => [...new Set(placed.map(n => n.site).filter(Boolean))] as string[], [placed]);
  const buildings  = useMemo(() => [...new Set(placed.filter(n => !filterSite || n.site === filterSite).map(n => n.building).filter(Boolean))] as string[], [placed, filterSite]);
  const assetTypes = useMemo(() => [...new Set(placed.map(n => n.asset_type).filter(Boolean))] as string[], [placed]);

  const hovNode  = hovered  ? placed.find(n => n.id === hovered)  : null;
  const selNode  = selected ? placed.find(n => n.id === selected)  : null;

  const canvasW = Math.max(...placed.map(n => (posMap.get(n.id)?.x ?? n.x) + NODE_W + PAD), 1200);
  const canvasH = Math.max(...placed.map(n => (posMap.get(n.id)?.y ?? n.y) + NODE_H + PAD), 700);

  if (!network) {
    return (
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          {error ? <p style={{ color: "var(--urgent)" }}>{error}</p> : <p>Loading network…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 0, display: "flex", flexDirection: "column", height: "100vh" }}>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="header" style={{ 
        padding: isMobile ? "0.5rem 1rem" : "0.5rem 1.5rem", 
        flexShrink: 0, 
        flexWrap: "wrap", 
        gap: "1rem",
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div className="title" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Logo height={isMobile ? "60px" : "100px"} />
          {!isMobile && <span style={{ fontSize: "1.25rem", fontWeight: 400, opacity: 0.8 }}>Network Intelligence</span>}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginLeft: "auto" }}>
          {isMobile ? (
             <button onClick={() => setShowFilters(!showFilters)} className="status-badge" style={{ padding: '0.4rem 0.8rem' }}>
               {showFilters ? "✕ Close" : "⬡ Filters"}
             </button>
          ) : (
            <>
              {role === "superadmin" && users.length > 0 && (
                <select value={selOwner ?? ""} onChange={e => setSelOwner(e.target.value ? Number(e.target.value) : undefined)}
                  style={{ fontSize: "0.80rem", padding: "0.4rem 0.65rem", minWidth: 170 }}>
                  <option value="">All Networks</option>
                  {users.filter(u => u.role !== "superadmin").map(u => (
                    <option key={u.id} value={u.id}>{(u.email ? u.email.split('@')[0] : u.username)}'s Network</option>
                  ))}
                </select>
              )}
              <div style={{ display: "flex", borderRadius: 28, overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
                {(["topology", "location"] as const).map(mode => (
                  <button key={mode} onClick={() => setViewMode(mode)} style={{
                    padding: "0.45rem 0.85rem", cursor: "pointer", fontSize: "0.78rem",
                    background: viewMode === mode ? "rgba(255,255,255,0.16)" : "transparent",
                    border: "none", color: "#fff", fontFamily: "inherit",
                  }}>
                    {mode === "topology" ? "⬡ Topology" : "📍 Location"}
                  </button>
                ))}
              </div>
            </>
          )}
          <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            className="status-badge" style={{ cursor: "pointer", fontSize: "0.78rem", display: isMobile ? 'none' : 'block' }}>↺ Reset</button>
          <button onClick={() => router.push("/")} className="status-badge" style={{ cursor: "pointer", background: "transparent", fontSize: isMobile ? '0.7rem' : '0.9rem' }}>
            {isMobile ? "Back" : "Dashboard"}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {(showFilters || !isMobile) && (
          <div className="glass-panel" style={{
            width: isMobile ? '100%' : 200, 
            position: isMobile ? 'absolute' : 'relative',
            zIndex: 50,
            height: isMobile ? 'auto' : '100%',
            maxHeight: isMobile ? '60%' : 'none',
            flexShrink: 0, overflowY: "auto",
            padding: "0.9rem",
          }}>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, opacity: 0.55, letterSpacing: "0.08em", marginBottom: "0.65rem" }}>FILTERS</div>

            {isMobile && (
              <div className="control-group" style={{ marginBottom: "0.55rem" }}>
                <label style={{ fontSize: "0.72rem" }}>View Mode</label>
                <select value={viewMode} onChange={e => setViewMode(e.target.value as any)} style={{ fontSize: "0.76rem", padding: "0.38rem 0.55rem" }}>
                  <option value="topology">Topology</option>
                  <option value="location">Location</option>
                </select>
              </div>
            )}

            <div className="control-group" style={{ marginBottom: "0.55rem" }}>
              <label style={{ fontSize: "0.72rem" }}>Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ID, name, panel…" style={{ fontSize: "0.76rem", padding: "0.38rem 0.55rem" }} />
            </div>

            {[
              { label: "Site", val: filterSite, set: setFilterSite, opts: sites },
              { label: "Building", val: filterBuilding, set: setFilterBuilding, opts: buildings },
              { label: "Type", val: filterType, set: setFilterType, opts: assetTypes },
            ].map(({ label, val, set, opts }) => (
              <div className="control-group" key={label} style={{ marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.72rem" }}>{label}</label>
                <select value={val} onChange={e => set(e.target.value)} style={{ fontSize: "0.76rem", padding: "0.38rem 0.55rem" }}>
                  <option value="">All</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}

            <button onClick={() => { setSearch(""); setFilterSite(""); setFilterBuilding(""); setFilterType(""); setSelected(null); setShowFilters(false); }}
              className="status-badge" style={{ width: "100%", cursor: "pointer", marginTop: "0.2rem", background: "transparent", textAlign: "center", fontSize: "0.74rem" }}>
              Reset Filters
            </button>

            {/* State legend */}
            {!isMobile && (
              <>
                <div style={{ marginTop: "1.1rem", fontSize: "0.72rem", opacity: 0.6 }}>
                  <div style={{ fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.35rem" }}>STATE</div>
                  {Object.entries(STATE_COLOR).map(([s, c]) => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />{s}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "0.9rem", fontSize: "0.72rem", opacity: 0.6 }}>
                  <div style={{ fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.35rem" }}>TYPE</div>
                  {Object.entries(TYPE_ACCENT).map(([t, c]) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <div style={{ width: 9, height: 4, borderRadius: 2, background: c }} />{t}
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
              <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.3)" />
              </marker>
              <marker id="arr-hi" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.92)" />
              </marker>
            </defs>

            <rect className="bg-rect" x={0} y={0} width="100%" height="100%" fill="transparent" />

            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>

              {/* ─── Location clusters (rendered FIRST, behind everything) ── */}
              {viewMode === "location" && locClusters.map((cl, ci) => {
                const hidden = (filterSite || filterBuilding || filterType || search) &&
                  !placed.filter(n => isVisible(n)).some(n => (n.building || n.site || "Unassigned") === cl.key);
                return (
                  <g key={cl.key} opacity={hidden ? 0.15 : 1} style={{ transition: "opacity 0.2s" }}>
                    <rect x={cl.x} y={cl.y} width={cl.w} height={cl.h} rx={18} ry={18}
                      fill={cl.color} stroke={CLUSTER_BORDERS[ci % CLUSTER_BORDERS.length]}
                      strokeWidth={1.5} />
                    <text x={cl.x + CLUSTER_PAD_X} y={cl.y + 26}
                      fill="rgba(255,255,255,0.55)" fontSize={12} fontWeight={700} letterSpacing={0.5}>
                      {cl.label}
                    </text>
                  </g>
                );
              })}

              {/* ─── Edges ─────────────────────────────────────────────────── */}
              {edges.map(edge => {
                const p = posMap.get(edge.parent_asset_id);
                const c = posMap.get(edge.child_asset_id);
                if (!p || !c) return null;

                const isOnPath = selected && (
                  edge.parent_asset_id === selected || edge.child_asset_id === selected ||
                  (upstream.has(edge.parent_asset_id)   && upstream.has(edge.child_asset_id)) ||
                  (downstream.has(edge.parent_asset_id) && downstream.has(edge.child_asset_id))
                );
                const dimmed = selected && !isOnPath;

                const x1 = p.x + NODE_W; const y1 = p.y + NODE_H / 2;
                const x2 = c.x;          const y2 = c.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;

                // Use S-curve in topology, elbow in location for clarity
                const d = viewMode === "topology"
                  ? `M${x1},${y1} C${x1 + 80},${y1} ${x2 - 80},${y2} ${x2},${y2}`
                  : `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;

                return (
                  <path key={edge.id} d={d}
                    stroke={isOnPath ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)"}
                    strokeWidth={isOnPath ? 2.5 : 1.5}
                    fill="none" opacity={dimmed ? 0.07 : 1}
                    markerEnd={isOnPath ? "url(#arr-hi)" : "url(#arr)"}
                  />
                );
              })}

              {/* ─── Nodes ─────────────────────────────────────────────────── */}
              {placed.map(node => {
                const pos = posMap.get(node.id) || { x: node.x, y: node.y };
                const visible    = isVisible(node);
                const isSel      = node.id === selected;
                const isConn     = !!(selected && (upstream.has(node.id) || downstream.has(node.id)));
                const dimmed     = !!(selected && !isSel && !isConn);
                const stateCol   = STATE_COLOR[node.network_state || "NORMAL"] || STATE_COLOR.NORMAL;
                const typeAccent = TYPE_ACCENT[node.asset_type] || "#fb923c";

                return (
                  <g key={node.id} transform={`translate(${pos.x},${pos.y})`}
                    style={{ cursor: "grab", opacity: (!visible || dimmed) ? 0.13 : 1, transition: "opacity 0.15s" }}
                    onMouseDown={ev => onNodeMouseDown(ev, node.id)}
                    onClick={() => setSelected(isSel ? null : node.id)}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Shadow */}
                    <rect width={NODE_W} height={NODE_H} rx={14} ry={14}
                      fill="rgba(0,0,0,0.5)" transform="translate(3,4)" />
                    {/* Card */}
                    <rect width={NODE_W} height={NODE_H} rx={14} ry={14}
                      fill="rgba(18,6,3,0.82)"
                      stroke={isSel ? "#fff" : isConn ? stateCol : "rgba(255,255,255,0.16)"}
                      strokeWidth={isSel ? 2 : isConn ? 1.5 : 1}
                    />
                    {/* Type bar */}
                    <rect x={0} y={0} width={4} height={NODE_H} rx={2} fill={typeAccent} opacity={0.85} />
                    {/* State dot */}
                    <circle cx={NODE_W - 14} cy={14} r={6} fill={stateCol} />
                    {/* Name */}
                    <text x={14} y={24} fill="#fff" fontSize={11} fontWeight={700} style={{ pointerEvents: "none" }}>
                      {node.name.length > 20 ? node.name.slice(0, 19) + "…" : node.name}
                    </text>
                    {/* ID */}
                    <text x={14} y={38} fill="rgba(255,255,255,0.5)" fontSize={9.5} style={{ pointerEvents: "none" }}>
                      {node.id}
                    </text>
                    {/* Location context */}
                    <text x={14} y={52} fill="rgba(255,255,255,0.33)" fontSize={8.5} style={{ pointerEvents: "none" }}>
                      {viewMode === "location"
                        ? [node.zone, node.panel].filter(Boolean).join(" · ") || node.asset_type
                        : [node.panel, node.floor].filter(Boolean).join(" · ") || node.asset_type}
                    </text>
                    {/* Load bar */}
                    {node.load_pct != null && (
                      <>
                        <rect x={14} y={60} width={NODE_W - 28} height={4} rx={2} fill="rgba(255,255,255,0.08)" />
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

          {/* ─── Hover Tooltip ──────────────────────────────────────────────── */}
          {hovNode && (
            <div style={{
              position: "absolute", bottom: 20, right: 20,
              background: "rgba(8,3,1,0.97)", border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 14, padding: "0.85rem 1.1rem", fontSize: "0.78rem",
              maxWidth: 260, zIndex: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", pointerEvents: "none",
            }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.25rem", color: TYPE_ACCENT[hovNode.asset_type] || "#fff" }}>
                {hovNode.name}
              </div>
              <div style={{ opacity: 0.45, marginBottom: "0.55rem", fontSize: "0.72rem" }}>{hovNode.id} · {hovNode.asset_type}</div>
              <div style={{ display: "grid", gridTemplateColumns: "65px 1fr", gap: "2px 8px", opacity: 0.82 }}>
                <span style={{ opacity: 0.45 }}>Site</span>     <span>{hovNode.site || "—"}</span>
                <span style={{ opacity: 0.45 }}>Building</span> <span>{hovNode.building || "—"}</span>
                <span style={{ opacity: 0.45 }}>Floor</span>    <span>{hovNode.floor || "—"}</span>
                <span style={{ opacity: 0.45 }}>Zone</span>     <span>{hovNode.zone || "—"}</span>
                <span style={{ opacity: 0.45 }}>Panel</span>    <span>{hovNode.panel || "—"}</span>
              </div>
              {hovNode.load_pct != null && (
                <div style={{ marginTop: "0.5rem", padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                  <span style={{ opacity: 0.45 }}>Load: </span>
                  <span style={{ color: STATE_COLOR[hovNode.network_state || "NORMAL"], fontWeight: 700 }}>{hovNode.load_pct}%</span>
                  <span style={{ opacity: 0.35, marginLeft: 5, fontSize: "0.69rem" }}>({hovNode.network_state})</span>
                </div>
              )}
              {selected && (upstream.has(hovNode.id) || downstream.has(hovNode.id)) && (
                <div style={{ marginTop: "0.35rem", fontSize: "0.69rem", opacity: 0.5 }}>
                  {upstream.has(hovNode.id) ? "⬆ Upstream from selected" : "⬇ Downstream from selected"}
                </div>
              )}
            </div>
          )}

          {/* ─── Selected path bar ──────────────────────────────────────────── */}
          {selNode && (
            <div style={{
              position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
              background: "rgba(8,3,1,0.95)", border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 28, padding: "0.35rem 1.1rem", fontSize: "0.78rem",
              zIndex: 40, display: "flex", alignItems: "center", gap: "0.65rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}>
              <span style={{ color: TYPE_ACCENT[selNode.asset_type] || "#fff", fontWeight: 700 }}>{selNode.name}</span>
              <span style={{ opacity: 0.35 }}>|</span>
              <span style={{ opacity: 0.65 }}>⬆ {upstream.size} upstream</span>
              <span style={{ opacity: 0.35 }}>|</span>
              <span style={{ opacity: 0.65 }}>⬇ {downstream.size} downstream</span>
              <button onClick={() => setSelected(null)}
                style={{ marginLeft: 2, background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.85rem" }}>
                ✕
              </button>
            </div>
          )}

          {/* ─── View mode label ────────────────────────────────────────────── */}
          <div style={{
            position: "absolute", bottom: 20, left: 20,
            fontSize: "0.7rem", opacity: 0.35, pointerEvents: "none",
          }}>
            {viewMode === "topology" ? "Hierarchical Topology" : "Location / Building View"} · {placed.length} nodes
          </div>
        </div>
      </div>
    </div>
  );
}
