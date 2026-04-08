import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface DegradationChartProps {
  timeline: any[];
  warningThreshold: number;
  criticalThreshold: number;
  loading?: boolean;
}

export function DegradationChart({ timeline, warningThreshold, criticalThreshold, loading }: DegradationChartProps) {
  return (
    <div style={{ width: '100%', height: 400, position: 'relative' }}>
      {loading && (
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)', 
          WebkitBackdropFilter: 'blur(4px)', zIndex: 10, borderRadius: '8px' 
        }}></div>
      )}
      <ResponsiveContainer>
        <LineChart data={timeline} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" vertical={false} />
          <XAxis 
            dataKey="timestamp" 
            stroke="rgba(255,255,255,0.7)"
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.7)" }} 
            tickFormatter={(v) => v.length > 10 ? v.substring(11, 16) : v}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.7)" 
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.7)" }} 
            domain={[-1, 'auto']} 
            label={{ value: "Standardized DI (σ units from baseline)", angle: -90, position: 'insideLeft', fill: "rgba(255,255,255,0.5)", fontSize: 11, dy: 60, dx: -20 }}
          />
          <Tooltip 
            contentStyle={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
          />
          <ReferenceLine y={warningThreshold} stroke="#eab308" strokeDasharray="5 5" label={{ position: 'insideTopRight', value: 'Warning Threshold', fill: '#eab308', fontSize: 13, fontWeight: 600 }} />
          <ReferenceLine y={criticalThreshold} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'insideTopRight', value: 'Critical Threshold', fill: '#ef4444', fontSize: 13, fontWeight: 600 }} />
          <Line 
            type="monotone" 
            dataKey="D_raw" 
            name="Raw DI (Standardized)"
            stroke="rgba(255,255,255,0.2)" 
            strokeWidth={1}
            dot={false}
            activeDot={false}
          />
          <Line 
            type="monotone" 
            dataKey="D" 
            name="Smoothed DI (Z-score)"
            stroke="#ffffff" 
            strokeWidth={3}
            dot={{ r: 0 }}
            activeDot={{ r: 6, fill: '#ffffff', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
