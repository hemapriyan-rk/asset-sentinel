"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BottomNavigation } from "@/components/BottomNavigation";
import { Logo } from "@/components/Logo";
import { useDeviceType } from "@/hooks/useDeviceType";
import {
  AssetMeta,
  fetchAssets,
  fetchSimulationProfiles,
  SimulationAssetProfile,
  SimulationResponse,
  simulateAsset,
} from "@/lib/api";

type TestSection = "simulation" | "flow";

type Stage = {
  id: number;
  name: string;
  typeLabel: string;
  detail: string;
  inputSample: string;
  outputSample: string;
  logic: string;
};

type LayoutNode = {
  id: number;
  x: number;
  y: number;
  row?: number;
  col?: number;
};

const FLOW_STAGES: Stage[] = [
  {
    id: 1,
    name: "Sensors",
    typeLabel: "Acquisition",
    detail: "Raw telemetry acquisition from voltage, current, temperature and vibration streams.",
    inputSample: '{"device": "RTU-44", "stream": "analog"}',
    outputSample: '{"rms_voltage": 228.7, "rms_current": 31.4, "surface_temperature": 62.1}',
    logic: "Sample-and-hold from field sensors at fixed cadence with timestamping.",
  },
  {
    id: 2,
    name: "Data Ingestion Layer",
    typeLabel: "Pipeline",
    detail: "Timestamp alignment, source tagging, and schema normalization.",
    inputSample: '{"rms_voltage": 228.7, "timestamp": "local"}',
    outputSample: '{"asset_id": "TR-01", "timestamp": "2026-04-03T08:15:00Z", "source": "SCADA"}',
    logic: "Normalize schema and map raw tags to canonical telemetry keys.",
  },
  {
    id: 3,
    name: "Data Cleaning & Filtering",
    typeLabel: "Conditioning",
    detail: "Outlier clipping, missing value repair, and noise suppression.",
    inputSample: '{"rms_voltage": 241.2, "surface_temperature": null}',
    outputSample: '{"rms_voltage": 227.9, "surface_temperature": 61.8, "noise_removed": true}',
    logic: "Apply deterministic filtering and imputation policy with audit flags.",
  },
  {
    id: 4,
    name: "Feature Extraction",
    typeLabel: "Feature Ops",
    detail: "Temporal features computed from telemetry windows for model input.",
    inputSample: '{"recon_error": [0.05, 0.06, 0.04]}',
    outputSample: '{"trend": 0.013, "acc": 0.004, "var_shift": 0.021}',
    logic: "Compute rolling smooth/trend/acceleration/variance-shift features.",
  },
  {
    id: 5,
    name: "Baseline Modeling",
    typeLabel: "Per Asset",
    detail: "Asset-specific baseline profile retrieval and standardization.",
    inputSample: '{"asset_id": "TR-01"}',
    outputSample: '{"mu_baseline": 0.27, "sigma_baseline": 0.11}',
    logic: "Load baseline profile bound to selected asset and apply z-score reference.",
  },
  {
    id: 6,
    name: "VAE Model Processing",
    typeLabel: "Model",
    detail: "Input feature space -> latent compression -> reconstruction.",
    inputSample: '{"X": [0.31, -0.12, 0.44, 0.08, ...]}',
    outputSample: '{"latent": [0.42, -0.18, 0.07, 0.33], "reconstruction_error": 0.061}',
    logic: "Encoder compresses features to latent space, decoder reconstructs and deviation is measured.",
  },
  {
    id: 7,
    name: "Degradation Scoring Engine",
    typeLabel: "Scoring",
    detail: "Degradation index and acceleration are computed against thresholds.",
    inputSample: '{"reconstruction_error": 0.061, "mu": 0.27, "sigma": 0.11}',
    outputSample: '{"DI_standardized": 1.94, "acc": 0.07, "state": "WARNING"}',
    logic: "Compute DI, smooth trajectory, and evaluate threshold state deterministically.",
  },
  {
    id: 8,
    name: "Decision / Action Layer",
    typeLabel: "Control",
    detail: "Final state and deterministic recommendation generated.",
    inputSample: '{"state": "WARNING", "top_cause": "surface_temperature"}',
    outputSample: '{"recommended_action": "Schedule thermal inspection"}',
    logic: "Map state + causes to recommended action policy and operator guidance.",
  },
];

function buildFlowLayout(compact: boolean): { nodes: LayoutNode[]; canvasWidth: number; canvasHeight: number; nodeW: number; nodeH: number } {
  if (compact) {
    const nodeW = 230;
    const nodeH = 122;
    const gapX = 56;
    const gapY = 84;
    const startX = 34;
    const startY = 30;

    const nodes: LayoutNode[] = FLOW_STAGES.map((stage, idx) => {
      const col = Math.floor(idx / 2);
      const row = idx % 2;
      return {
        id: stage.id,
        x: startX + col * (nodeW + gapX),
        y: startY + row * (nodeH + gapY),
        row,
        col,
      };
    });

    return {
      nodes,
      canvasWidth: startX * 2 + nodeW * 4 + gapX * 3,
      canvasHeight: startY * 2 + nodeH * 2 + gapY,
      nodeW,
      nodeH,
    };
  }

  const nodeW = 252;
  const nodeH = 132;
  const nodes: LayoutNode[] = [
    { id: 1, x: 44, y: 44, row: 0, col: 0 },
    { id: 2, x: 374, y: 44, row: 0, col: 1 },
    { id: 3, x: 704, y: 44, row: 0, col: 2 },
    { id: 4, x: 1034, y: 44, row: 0, col: 3 },
    { id: 5, x: 1364, y: 44, row: 0, col: 4 },
    { id: 6, x: 1694, y: 44, row: 0, col: 5 },
    { id: 7, x: 2024, y: 44, row: 0, col: 6 },
    { id: 8, x: 2354, y: 44, row: 0, col: 7 },
  ];

  return {
    nodes,
    canvasWidth: 2660,
    canvasHeight: 420,
    nodeW,
    nodeH,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getStageState(stageId: number, activeStage: number, isPlaying: boolean): "IDLE" | "ACTIVE" | "DONE" {
  if (!isPlaying && stageId > activeStage) return "IDLE";
  if (stageId < activeStage) return "DONE";
  if (stageId === activeStage) return "ACTIVE";
  return "IDLE";
}

function confidenceToScore(level?: string): number {
  if (level === "HIGH") return 0.86;
  if (level === "MEDIUM") return 0.67;
  return 0.48;
}

function healthFromNormalizedDI(di: number): "Healthy" | "Warning" | "Critical" {
  if (di < 0.4) return "Healthy";
  if (di < 0.7) return "Warning";
  return "Critical";
}

function formatRul(hours: number): string {
  if (hours >= 72) {
    return `${(hours / 24).toFixed(1)} days`;
  }
  return `${hours.toFixed(1)} h`;
}

export default function TestingPage() {
  const router = useRouter();
  const { isMobile } = useDeviceType();
  const [viewportWidth, setViewportWidth] = useState<number>(1600);
  const topChromeRef = useRef<HTMLDivElement | null>(null);

  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<TestSection>("simulation");
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(1);
  const [selectedStageId, setSelectedStageId] = useState<number>(1);

  const [assets, setAssets] = useState<AssetMeta[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");

  const [profiles, setProfiles] = useState<SimulationAssetProfile[]>([]);
  const [parameterValues, setParameterValues] = useState<Record<string, number>>({});

  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [topChromeHeight, setTopChromeHeight] = useState<number>(160);

  useEffect(() => {
    const updateViewport = () => {
      setViewportWidth(window.innerWidth || 1600);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const updateTopChrome = () => {
      setTopChromeHeight(topChromeRef.current?.offsetHeight ?? 160);
    };

    updateTopChrome();
    window.addEventListener("resize", updateTopChrome);
    return () => window.removeEventListener("resize", updateTopChrome);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [assetData, profileData] = await Promise.all([fetchAssets(), fetchSimulationProfiles()]);
        if (cancelled) return;

        setAssets(assetData);
        setProfiles(profileData);

        setSelectedAssetId((current) => current || assetData[0]?.id || "");
      } catch (error) {
        if (!cancelled) {
          setSimError(error instanceof Error ? error.message : "Failed to load testing resources");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? null;
  const activeAssetType = selectedAsset?.asset_type ?? profiles[0]?.asset_type ?? "GENERIC";
  const activeProfile = profiles.find((profile) => profile.asset_type === activeAssetType) ?? profiles[0] ?? null;
  const parameterList = activeProfile?.parameters ?? [];
  const compactFlow = viewportWidth < 1240;
  const flowLayout = useMemo(() => buildFlowLayout(compactFlow), [compactFlow]);
  const selectedStage = FLOW_STAGES.find((stage) => stage.id === selectedStageId) ?? FLOW_STAGES[0];

  useEffect(() => {
    if (!activeProfile) return;

    setParameterValues((current) => {
      const next = { ...current };
      for (const param of activeProfile.parameters) {
        if (next[param.key] === undefined) {
          next[param.key] = param.default;
        }
      }
      return next;
    });
  }, [activeProfile]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setActiveStage((current) => {
        if (current >= FLOW_STAGES.length) {
          window.clearInterval(timer);
          setIsPlaying(false);
          return current;
        }
        setSelectedStageId(current + 1);
        return current + 1;
      });
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const updateParameter = (key: string, value: number) => {
    setParameterValues((current) => ({ ...current, [key]: value }));
  };

  const runSimulation = async () => {
    if (!selectedAsset) {
      setSimError("Select an asset before running the simulation.");
      return;
    }

    setSimLoading(true);
    setSimError(null);

    try {
      const result = await simulateAsset({
        asset_id: selectedAsset.id,
        asset_type: activeAssetType,
        steps: 24,
        ...Object.fromEntries(parameterList.map((param) => [param.key, parameterValues[param.key] ?? param.default])),
      });

      setSimulation(result);
    } catch (error) {
      setSimError(error instanceof Error ? error.message : "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  const curveBundle = useMemo(() => {
    const degradation = simulation?.degradation_curve ?? [];
    const failure = simulation?.failure_trajectory ?? [];
    const sensitivity = simulation?.parameter_sensitivity ?? [];

    const actual = degradation.map((point, index) => ({
      t: index + 1,
      actual: point.di,
      projected: null as number | null,
    }));

    const lastActual = actual[actual.length - 1]?.actual ?? simulation?.degradation_index ?? 0;
    const projectedPoints = failure.map((point) => ({
      t: point.hour,
      actual: lastActual,
      projected: point.di,
    }));

    const crossingPoint = failure.find((point) => point.prob_critical >= 0.5 || point.di >= 0.7);
    const rulHours = simulation?.rul?.hours ?? (crossingPoint ? crossingPoint.hour : null);
    const confidenceScore = simulation?.confidence_score ?? 0;

    return {
      merged: [...actual, ...projectedPoints],
      projectedOnly: failure.map((point) => ({ t: point.hour, projected: point.di, critical: point.prob_critical })),
      diNormalized: simulation?.degradation_index ?? lastActual,
      rulHours,
      confidenceScore,
      crossingT: crossingPoint ? `P+${crossingPoint.hour}` : "N/A",
      sensitivity: sensitivity.map((point) => ({
        name: point.name,
        value: point.contribution,
      })),
    };
  }, [simulation]);

  const healthState = healthFromNormalizedDI(curveBundle.diNormalized);
  const gaugeColor = healthState === "Healthy" ? "#22c55e" : healthState === "Warning" ? "#f59e0b" : "#ef4444";
  const gaugeValue = Math.round(curveBundle.diNormalized * 100);
  const gaugeProgress = 2 * Math.PI * 52 * (1 - clamp(curveBundle.diNormalized, 0, 1));

  const handleStartFlow = () => {
    setActiveStage(1);
    setSelectedStageId(1);
    setIsPlaying(true);
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === "dashboard") router.push("/");
    else if (tabId === "network") router.push("/network");
    else if (tabId === "location") router.push("/location");
    else if (tabId === "superadmin") router.push("/superadmin");
    else if (tabId === "logout") {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      router.push("/login");
    }
  };

  if (!ready) return null;

  return (
    <div className="container" style={{ paddingBottom: isMobile ? "6rem" : "1.25rem" }}>
      <div ref={topChromeRef} style={{ maxWidth: 1280, margin: "0 auto" }}>
        <header
          className="header"
          style={{
            marginBottom: "0.85rem",
            padding: "0.7rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(14px)",
          }}
        >
          <Logo height={isMobile ? "42px" : "54px"} />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button className="status-badge" onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
              Dashboard
            </button>
            <button className="status-badge" onClick={() => router.push("/superadmin")} style={{ cursor: "pointer" }}>
              Command
            </button>
            <span className="status-badge" style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.35)", color: "#bae6fd" }}>
              Testing
            </span>
          </div>
        </header>

        <section className="card" style={{ padding: "0.65rem 0.75rem", marginBottom: "0.8rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setSection("simulation")}
            className="status-badge"
            style={{
              cursor: "pointer",
              background: section === "simulation" ? "rgba(245, 158, 11, 0.2)" : "rgba(255,255,255,0.03)",
              border: section === "simulation" ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Simulation Lab
          </button>
          <button
            onClick={() => setSection("flow")}
            className="status-badge"
            style={{
              cursor: "pointer",
              background: section === "flow" ? "rgba(245, 158, 11, 0.2)" : "rgba(255,255,255,0.03)",
              border: section === "flow" ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Data Flow Visualizer
          </button>
        </section>
      </div>

      {section === "simulation" && (
        <div className="layout" style={isMobile ? { display: "flex", flexDirection: "column" } : {}}>
          <aside className="card" style={{ padding: "1rem" }}>
            <h3 style={{ margin: 0, marginBottom: "1rem" }}>Simulation Lab</h3>

            <div className="control-group">
              <label>Target Asset</label>
              <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} disabled={simLoading}>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label>Active Profile</label>
              <div className="status-badge" style={{ justifyContent: "space-between", width: "100%", fontSize: "0.8rem", background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.24)" }}>
                <span>{activeProfile?.display_name || activeAssetType}</span>
                <strong>{activeAssetType}</strong>
              </div>
            </div>

            {parameterList.map((param) => {
              const currentValue = parameterValues[param.key] ?? param.default;
              const step = param.max <= 1 ? 0.01 : param.max - param.min <= 20 ? 0.1 : 1;
              return (
                <div className="control-group" key={param.key}>
                  <label style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span>{param.label} ({param.unit})</span>
                    <strong>{currentValue.toFixed(param.max <= 1 ? 2 : 1)}</strong>
                  </label>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={step}
                    value={currentValue}
                    onChange={(e) => updateParameter(param.key, Number(e.target.value))}
                    disabled={simLoading}
                  />
                </div>
              );
            })}

            <button className="status-badge bg-monitor" style={{ width: "100%", marginTop: "0.7rem", cursor: simLoading ? "not-allowed" : "pointer", opacity: simLoading ? 0.7 : 1 }} onClick={runSimulation} disabled={simLoading || !selectedAssetId}>
              {simLoading ? "Running Simulation..." : "Run Simulation"}
            </button>

            {simError && <div style={{ marginTop: "0.8rem", fontSize: "0.8rem", color: "#fca5a5" }}>{simError}</div>}
          </aside>

          <main>
            <section className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.7rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>Degradation Curve</h3>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  <div className="status-badge" style={{ fontSize: "0.72rem" }}>Crossing: {curveBundle.crossingT}</div>
                  {simulation?.thresholds?.baseline_autotuned && (
                    <div className="status-badge" style={{ fontSize: "0.72rem", background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.35)", color: "#bae6fd" }}>
                      Auto Baseline
                    </div>
                  )}
                </div>
              </div>
              <div style={{ height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curveBundle.merged}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="t" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 1.2]} />
                    <Tooltip contentStyle={{ background: "rgba(8,10,15,0.95)", border: "1px solid rgba(255,255,255,0.18)" }} />
                    <ReferenceLine y={0.2} stroke="#22c55e" strokeDasharray="3 3" />
                    <ReferenceLine y={0.7} stroke="#f59e0b" strokeDasharray="3 3" />
                    <ReferenceLine y={0.9} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="actual" name="Current Trajectory" stroke="#38bdf8" strokeWidth={2.2} dot={false} isAnimationActive />
                    <Line type="monotone" dataKey="projected" name="Projected Failure" stroke="#f97316" strokeWidth={2.2} strokeDasharray="6 4" dot={false} isAnimationActive />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {simulation && (!simulation.timeline || simulation.timeline.length === 0) && (
                <div style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "#fca5a5" }}>
                  No timeline returned from backend model for this asset.
                </div>
              )}
            </section>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
              <section className="card" style={{ padding: "1rem" }}>
                <h4 style={{ margin: 0, marginBottom: "0.7rem" }}>Parameter Sensitivity</h4>
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={curveBundle.sensitivity || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                      <YAxis stroke="rgba(255,255,255,0.5)" />
                      <Tooltip
                        contentStyle={{ background: "rgba(8,10,15,0.95)", border: "1px solid rgba(255,255,255,0.18)" }}
                        formatter={(v: unknown) => {
                          const n = Number(v ?? 0);
                          return `${n.toFixed(1)}%`;
                        }}
                      />
                      <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} isAnimationActive />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.74rem", opacity: 0.65 }}>
                  Impact distribution updates live from the selected asset profile and model errors.
                </div>
              </section>

              <section className="card" style={{ padding: "1rem" }}>
                <h4 style={{ margin: 0, marginBottom: "0.75rem" }}>System Health</h4>
                <div style={{ display: "grid", gap: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                    <svg width="130" height="130" viewBox="0 0 130 130">
                      <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
                      <circle
                        cx="65"
                        cy="65"
                        r="52"
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        transform="rotate(-90 65 65)"
                        strokeDasharray={2 * Math.PI * 52}
                        strokeDashoffset={gaugeProgress}
                        style={{ transition: "stroke-dashoffset 350ms ease" }}
                      />
                      <text x="65" y="61" textAnchor="middle" fill="#f8fafc" fontSize="22" fontWeight="700">{gaugeValue}</text>
                      <text x="65" y="79" textAnchor="middle" fill="rgba(255,255,255,0.62)" fontSize="10">DI / 100</text>
                    </svg>

                    <div style={{ flex: 1 }}>
                      <div className={`health-badge ${healthState === "Healthy" ? "health-ok" : healthState === "Warning" ? "health-warn" : "health-critical"}`}>
                        {healthState === "Healthy" && <CheckCircle2 size={14} />}
                        {healthState === "Warning" && <Activity size={14} />}
                        {healthState === "Critical" && <ShieldAlert size={14} />}
                        <span>{healthState}</span>
                      </div>

                      <div style={{ marginTop: "0.65rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: "0.25rem" }}>
                          <span>Remaining Useful Life</span>
                          <strong>{formatRul(curveBundle.rulHours || 0)}</strong>
                        </div>
                        <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.round((1 - clamp(curveBundle.diNormalized, 0, 1)) * 100)}%`,
                              background: gaugeColor,
                              transition: "width 320ms ease",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: "0.65rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: "0.25rem" }}>
                          <span>Confidence</span>
                          <strong>{Math.round((curveBundle.confidenceScore || 0) * 100)}%</strong>
                        </div>
                        <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.round((curveBundle.confidenceScore || 0) * 100)}%`,
                              background: "#38bdf8",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.7rem" }}>
                    <h5 style={{ margin: 0, marginBottom: "0.45rem", fontSize: "0.82rem", opacity: 0.9 }}>
                      Failure Trajectory
                    </h5>
                    <div style={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={curveBundle.projectedOnly || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="t" stroke="rgba(255,255,255,0.5)" />
                          <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 1.2]} />
                          <Tooltip contentStyle={{ background: "rgba(8,10,15,0.95)", border: "1px solid rgba(255,255,255,0.18)" }} />
                          <ReferenceLine y={0.9} stroke="#ef4444" strokeDasharray="4 4" />
                          <Area type="monotone" dataKey="projected" stroke="#f97316" fill="rgba(249,115,22,0.25)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      )}

      {section === "flow" && (
        <section
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            top: topChromeHeight,
            width: "100vw",
            height: `calc(100vh - ${topChromeHeight}px)`,
            overflow: "hidden",
            background:
              "radial-gradient(1200px 480px at 15% 20%, rgba(120, 43, 8, 0.36), transparent 68%), linear-gradient(180deg, rgba(16, 6, 3, 0.99), rgba(8, 2, 1, 1))",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${flowLayout.canvasWidth} ${flowLayout.canvasHeight}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            <defs>
              <marker id="arrow-head" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                <path d="M0,0 L0,9 L9,4.5 z" fill="rgba(255,193,122,0.78)" />
              </marker>
            </defs>

            {FLOW_STAGES.slice(0, FLOW_STAGES.length - 1).map((stage) => {
              const src = flowLayout.nodes[stage.id - 1];
              const dst = flowLayout.nodes[stage.id];

              const nodeW = flowLayout.nodeW;
              const nodeH = flowLayout.nodeH;

              let x1 = src.x + nodeW;
              let y1 = src.y + nodeH / 2;
              let x2 = dst.x;
              let y2 = dst.y + nodeH / 2;
              let path = `M${x1},${y1} C${x1 + 44},${y1} ${x2 - 44},${y2} ${x2},${y2}`;

              if (dst.x <= src.x) {
                x1 = src.x + nodeW / 2;
                y1 = src.y + nodeH;
                x2 = dst.x + nodeW / 2;
                y2 = dst.y;
                path = `M${x1},${y1} C${x1 + 30},${y1 + 28} ${x2 + 30},${y2 - 28} ${x2},${y2}`;
              }

              const edgeState = stage.id < activeStage ? "DONE" : stage.id === activeStage && isPlaying ? "ACTIVE" : "IDLE";
              const edgeColor = edgeState === "DONE" ? "#22c55e" : edgeState === "ACTIVE" ? "#f59e0b" : "rgba(255,193,122,0.32)";
              const packetLabel = stage.id % 3 === 1 ? "voltage" : stage.id % 3 === 2 ? "current" : "temperature";

              return (
                <g key={`edge-${stage.id}`}>
                  <path
                    d={path}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={edgeState === "ACTIVE" ? 2.6 : 1.4}
                    markerEnd="url(#arrow-head)"
                    className={edgeState === "ACTIVE" ? "flow-edge-active" : edgeState === "DONE" ? "flow-edge-done" : ""}
                  />
                  <text x={(x1 + x2) / 2} y={Math.min(y1, y2) - 10} fill="rgba(255,223,188,0.58)" fontSize="11" textAnchor="middle">
                    {packetLabel}
                  </text>
                  {edgeState !== "IDLE" && (
                    <>
                      <circle r="3.5" fill={edgeState === "ACTIVE" ? "#fbbf24" : "#4ade80"}>
                        <animateMotion dur={edgeState === "ACTIVE" ? "1.1s" : "2.4s"} repeatCount="indefinite" path={path} />
                      </circle>
                      <circle r="2.2" fill={edgeState === "ACTIVE" ? "#f59e0b" : "#22c55e"} opacity="0.85">
                        <animateMotion dur={edgeState === "ACTIVE" ? "1.45s" : "2.95s"} begin="0.26s" repeatCount="indefinite" path={path} />
                      </circle>
                    </>
                  )}
                </g>
              );
            })}

            {FLOW_STAGES.map((stage) => {
              const layout = flowLayout.nodes[stage.id - 1];
              const stageState = getStageState(stage.id, activeStage, isPlaying);
              const isVae = stage.name === "VAE Model Processing";
              const isSelected = selectedStageId === stage.id;
              const statusColor = stageState === "DONE" ? "#22c55e" : stageState === "ACTIVE" ? "#f59e0b" : "rgba(255,214,170,0.62)";
              const cardBorder = stageState === "ACTIVE" ? "rgba(245,158,11,0.82)" : stageState === "DONE" ? "rgba(34,197,94,0.62)" : "rgba(255,193,122,0.32)";
              const progressWidth = stageState === "IDLE" ? 52 : stageState === "ACTIVE" ? Math.max(flowLayout.nodeW - 72, 150) : Math.max(flowLayout.nodeW - 26, 190);
              const progressTrackW = flowLayout.nodeW - 28;
              const vaeBoxW = flowLayout.nodeW - 28;
              const overlayX = layout.x + 12;
              const overlayY = layout.y + flowLayout.nodeH + 12;

              return (
                <g key={`node-${stage.id}`} transform={`translate(${layout.x}, ${layout.y})`} onClick={() => setSelectedStageId(stage.id)} style={{ cursor: "pointer" }}>
                  <rect x={2} y={3} width={flowLayout.nodeW} height={flowLayout.nodeH} rx={12} fill="rgba(0,0,0,0.38)" />
                  <rect
                    width={flowLayout.nodeW}
                    height={flowLayout.nodeH}
                    rx={12}
                    fill="rgba(23,10,5,0.92)"
                    stroke={cardBorder}
                    strokeWidth={isSelected ? 1.8 : 1.2}
                    className={stageState === "ACTIVE" ? "flow-node-pulse" : ""}
                  />
                  <text x={14} y={24} fill="#fff4e8" fontSize="13" fontWeight="700">
                    {stage.name}
                  </text>
                  <text x={14} y={42} fill="rgba(255,215,176,0.78)" fontSize="10.5" letterSpacing="1">
                    {stage.typeLabel.toUpperCase()}
                  </text>
                  <circle cx={flowLayout.nodeW - 14} cy={15} r={4.2} fill={statusColor} />

                  <rect x={14} y={56} width={progressTrackW} height={4.5} rx={999} fill="rgba(255,255,255,0.08)" />
                  <rect x={14} y={56} width={progressWidth} height={4.5} rx={999} fill={statusColor} />

                  {isVae && (
                    <>
                      <rect x={14} y={74} width={vaeBoxW} height={45} rx={8} fill="rgba(48,17,7,0.76)" stroke="rgba(245,158,11,0.38)" />
                      <text x={22} y={91} fill="rgba(255,228,199,0.92)" fontSize="10">
                        input to latent to reconstruction
                      </text>
                      <text x={22} y={107} fill="rgba(253,186,116,0.95)" fontSize="10">
                        anomaly score: 0.061
                      </text>
                      {stageState === "ACTIVE" && <rect x={22} y={111} width={Math.max(vaeBoxW - 18, 150)} height={2.5} rx={999} className="vae-active-line" />}
                    </>
                  )}

                  {(compactFlow || simulation) && (
                    <g transform={`translate(${overlayX}, ${overlayY})`}>
                      <rect x={0} y={0} width={150} height={58} rx={10} fill="rgba(10,4,2,0.58)" stroke="rgba(255,193,122,0.15)" />
                      <text x={10} y={19} fill="#ffd6ad" fontSize="10">
                        voltage: {simulation?.timeline?.[stage.id - 1]?.rms_voltage ? Math.round(Number(simulation.timeline?.[stage.id - 1]?.rms_voltage)) : "--"}
                      </text>
                      <text x={10} y={34} fill="#fbc97d" fontSize="10">
                        current: {simulation?.timeline?.[stage.id - 1]?.rms_current ? Math.round(Number(simulation.timeline?.[stage.id - 1]?.rms_current)) : "--"}
                      </text>
                      <text x={10} y={49} fill="#fca5a5" fontSize="10">
                        temp: {simulation?.timeline?.[stage.id - 1]?.surface_temperature ? Math.round(Number(simulation.timeline?.[stage.id - 1]?.surface_temperature)) : "--"}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: "0.5rem", zIndex: 20, alignItems: "center" }}>
            <button className="status-badge" onClick={handleStartFlow} style={{ cursor: "pointer", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,193,122,0.18)", color: "#ffe2c2", backdropFilter: "blur(10px)" }}>
              Start
            </button>
            <button className="status-badge" onClick={() => setIsPlaying(false)} style={{ cursor: "pointer", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,193,122,0.18)", color: "#ffe2c2", backdropFilter: "blur(10px)" }}>
              Pause
            </button>
            <button className="status-badge" onClick={() => { setIsPlaying(false); setActiveStage(1); setSelectedStageId(1); }} style={{ cursor: "pointer", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,193,122,0.18)", color: "#ffe2c2", backdropFilter: "blur(10px)" }}>
              Reset
            </button>
          </div>

          <div style={{ position: "absolute", left: 16, top: 16, right: 220, zIndex: 20, display: "flex", gap: "0.5rem", alignItems: "center", color: "rgba(255,231,211,0.72)", fontSize: "0.72rem", pointerEvents: "none", flexWrap: "wrap" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#38bdf8", display: "inline-block" }} /> voltage
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#f59e0b", display: "inline-block" }} /> current
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444", display: "inline-block" }} /> temperature
            <span style={{ marginLeft: 8, padding: "0.24rem 0.55rem", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {selectedStage.name} · {selectedStage.typeLabel}
            </span>
          </div>

          <div style={{ position: "absolute", left: "50%", bottom: 12, transform: "translateX(-50%)", zIndex: 30, width: "min(680px, calc(100vw - 2rem))", padding: "1rem 1.2rem", borderRadius: 24, background: "linear-gradient(135deg, rgba(28, 8, 2, 0.42), rgba(12, 4, 1, 0.28))", border: "1px solid rgba(255,193,122,0.22)", boxShadow: "0 25px 64px rgba(0,0,0,0.48), inset 0 1px 1px rgba(255,255,255,0.08), 0 0 1px rgba(255,193,122,0.1)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", textAlign: "center", pointerEvents: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem", padding: "0.32rem 0.75rem", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,231,211,0.82)", fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Active Layer
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff7ef", lineHeight: 1.1, marginBottom: "0.35rem" }}>{selectedStage.name}</div>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.35rem 0.72rem", borderRadius: 999, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.26)", color: "#fcd34d", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
              {selectedStage.typeLabel}
            </div>
            <div style={{ fontSize: "0.95rem", color: "rgba(255,237,223,0.9)", lineHeight: 1.65, maxWidth: 680, margin: "0 auto" }}>{selectedStage.detail}</div>
            <div style={{ marginTop: "0.95rem", fontSize: "0.82rem", color: "rgba(255,193,122,0.86)", lineHeight: 1.6, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>{selectedStage.logic}</div>
          </div>
        </section>
      )}

      {isMobile && (
        <BottomNavigation activeTab="testing" onTabChange={handleTabChange} isSuperAdmin={true} />
      )}

      <style jsx global>{`
        .flow-edge-active {
          stroke-dasharray: 7 5;
          animation: flowDash 1.2s linear infinite;
          filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.45));
        }
        .flow-edge-done {
          stroke-dasharray: 4 4;
          animation: flowDash 3.2s linear infinite;
        }
        .flow-node-pulse {
          animation: flowPulse 1.05s ease-in-out infinite;
        }
        .vae-active-line {
          fill: url(#none);
          background: linear-gradient(90deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.95), rgba(34,197,94,0.35));
          background-size: 200% 100%;
          animation: vaeFlow 1.15s linear infinite;
        }
        .vae-pipeline {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.35rem;
          font-size: 0.72rem;
          opacity: 0.8;
        }
        .vae-pipeline-bar {
          margin-top: 0.35rem;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.35), rgba(245, 158, 11, 0.8), rgba(34, 197, 94, 0.35));
          background-size: 200% 100%;
          animation: vaeFlow 1.2s linear infinite;
        }
        .health-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          border: 1px solid transparent;
        }
        .health-ok {
          color: #86efac;
          background: rgba(34, 197, 94, 0.16);
          border-color: rgba(34, 197, 94, 0.45);
          animation: healthPulseOk 1.8s ease-in-out infinite;
        }
        .health-warn {
          color: #fcd34d;
          background: rgba(245, 158, 11, 0.18);
          border-color: rgba(245, 158, 11, 0.5);
          animation: healthPulseWarn 1s ease-in-out infinite;
        }
        .health-critical {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.55);
          animation: healthPulseCritical 0.75s ease-in-out infinite;
        }
        @keyframes flowPulse {
          0% { box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.26), 0 0 14px rgba(245, 158, 11, 0.22); }
          50% { box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.34), 0 0 24px rgba(245, 158, 11, 0.42); }
          100% { box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.26), 0 0 14px rgba(245, 158, 11, 0.22); }
        }
        @keyframes flowDash {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -18; }
        }
        @keyframes vaeFlow {
          0% { background-position: 0 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes healthPulseOk {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.28); }
          70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes healthPulseWarn {
          0% { opacity: 0.85; }
          50% { opacity: 1; }
          100% { opacity: 0.85; }
        }
        @keyframes healthPulseCritical {
          0% { opacity: 0.72; }
          50% { opacity: 1; }
          100% { opacity: 0.72; }
        }
      `}</style>
    </div>
  );
}
