import React from "react";

interface KPIGridProps {
  kpis: {
    state: string;
    degradation: number;
    acceleration: number;
    top_cause: string;
    trend: string;
    confidence: string;
  };
}

export function KPIGrid({ kpis }: KPIGridProps) {
  const getStateClass = (state: string) => {
    switch (state) {
      case "CRITICAL": return "text-urgent";
      case "WARNING": return "text-monitor";
      default: return "text-normal";
    }
  };

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-label">System State</div>
        <div className={`kpi-value ${getStateClass(kpis.state)}`}>
          {kpis.state}
        </div>
        <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
          Confidence: <strong>{kpis.confidence}</strong>
        </div>
      </div>
      
      <div className="kpi-card">
        <div className="kpi-label">Degradation Index</div>
        <div className="kpi-value" style={{ fontSize: '1.2rem' }}>
          {(kpis.degradation ?? 0) < 0 ? "↓↓ Better than Baseline" : 
           (kpis.degradation ?? 0) < 1.0 ? "→ Nominal Performance" :
           (kpis.degradation ?? 0) < 2.0 ? "↗ Signs of Aging" :
           (kpis.degradation ?? 0) < 3.0 ? "↑ Elevated" : "↑↑ High Risk"}
        </div>
      </div>
      
      <div className="kpi-card">
        <div className="kpi-label">Change Speed</div>
        <div className="kpi-value" style={{ 
          color: (kpis.acceleration ?? 0) > 0 ? 'var(--attention)' : 'var(--normal)',
          fontSize: '1.2rem'
        }}>
          {(kpis.acceleration ?? 0) > 0.05 ? "↑↑ Accelerating" :
           (kpis.acceleration ?? 0) > 0.01 ? "↑ Increasing" :
           (kpis.acceleration ?? 0) < -0.05 ? "↓↓ Recovering Fast" :
           (kpis.acceleration ?? 0) < -0.01 ? "↓ Decelerating" : "→ Stable Trend"}
        </div>
        <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
          {kpis.trend}
        </div>
      </div>
      
      <div className="kpi-card">
        <div className="kpi-label">Primary Anomaly Lead</div>
        <div className="kpi-value" style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={kpis.top_cause}>
          {kpis.top_cause || "None"}
        </div>
      </div>
    </div>
  );
}
