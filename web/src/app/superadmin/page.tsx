"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDeviceType } from "@/hooks/useDeviceType";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  fetchSystemUsers, 
  fetchAuditLogs, 
  fetchAdminMetrics, 
  SystemUser, 
  AuditLogEntry, 
  SystemMetrics 
} from "@/lib/api";
import { Logo } from "@/components/Logo";
import { BottomNavigation } from "@/components/BottomNavigation";

const MOCK_TRAFFIC = [
  { time: "10:00", active: 240, errors: 2 },
  { time: "11:00", active: 300, errors: 1 },
  { time: "12:00", active: 450, errors: 4 },
  { time: "13:00", active: 520, errors: 3 },
  { time: "14:00", active: 480, errors: 1 },
  { time: "15:00", active: 610, errors: 5 },
];

export default function SuperAdminPanel() {
  const router = useRouter();
  const { isMobile } = useDeviceType();
  const [email, setEmail] = useState<string | null>(null);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail");
    const storedRole = localStorage.getItem("userRole");
    
    // STRICT ACCESS: Only admin@assetsentinel.com
    if (storedEmail !== "admin@assetsentinel.com" || storedRole !== "superadmin") {
      router.push("/");
      return;
    }
    
    setEmail(storedEmail);

    async function loadData() {
      try {
        const [u, l, m] = await Promise.all([
          fetchSystemUsers(),
          fetchAuditLogs(10),
          fetchAdminMetrics()
        ]);
        setUsers(u);
        setLogs(l);
        setMetrics(m);
      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [router]);

  if (!email) return null;

  const handleTabChange = (tabId: string) => {
    if (tabId === 'dashboard') router.push('/');
    else if (tabId === 'network') router.push('/network');
    else if (tabId === 'location') router.push('/location');
    else if (tabId === 'testing') router.push('/testing');
    else if (tabId === 'logout') {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      router.push("/login");
    }
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', paddingBottom: isMobile ? '6rem' : '2rem' }}>
      <header className="header" style={{ marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <Logo height={isMobile ? "60px" : "100px"} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="status-badge bg-urgent pulse" style={{ animation: 'pulse 2s infinite', fontWeight: 700 }}>LIVE COMMAND</div>
          <button onClick={() => router.push("/testing")} className="status-badge" style={{ cursor: 'pointer', padding: '0.6rem 1.2rem', fontWeight: 600, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', color: '#bae6fd' }}>
            Testing
          </button>
          <button onClick={() => router.push("/")} className="status-badge" style={{ cursor: 'pointer', padding: '0.6rem 1.4rem', fontWeight: 600 }}>
            Dashboard
          </button>
        </div>
      </header>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total System Users</div>
          <div className="kpi-value" style={{ color: 'var(--text-bright)' }}>{metrics?.total_users ?? "--"}</div>
        </div>
        <div className="kpi-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="kpi-label">Active Deployments</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{metrics?.active_deployments ?? "--"}</div>
        </div>
        <div className="kpi-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="kpi-label">Node Uptime</div>
          <div className="kpi-value" style={{ color: 'var(--normal)' }}>{metrics?.node_uptime ?? "99.9%"}</div>
        </div>
        <div className="kpi-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="kpi-label">Telemetry Points</div>
          <div className="kpi-value" style={{ color: 'var(--monitor)' }}>{metrics?.telemetry_points ?? "--"}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-bright)', fontSize: isMobile ? '1.1rem' : '1.25rem' }}>Global Traffic & Reliability</h3>
          <div style={{ height: isMobile ? '200px' : '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_TRAFFIC}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip 
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                  itemStyle={{ color: 'var(--text-bright)' }}
                />
                <Line type="monotone" dataKey="active" stroke="var(--accent)" strokeWidth={3} dot={{ fill: 'var(--accent)' }} />
                <Line type="monotone" dataKey="errors" stroke="var(--urgent)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-bright)' }}>Audit Logs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-bright)' }}>{log.user}</strong>: {log.action}</span>
                  <span style={{ color: 'var(--monitor)', fontSize: '0.75rem' }}>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                {log.details && <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{log.details}</div>}
              </div>
            )) : (
              <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No recent logs</div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>User Management</h3>
          <button className="status-badge bg-normal">Add System User</button>
        </div>
        <div style={{ minWidth: '600px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-muted)' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '1rem' }}>User Email</th>
              <th style={{ padding: '1rem' }}>Assigned Role</th>
              <th style={{ padding: '1rem' }}>Last Activity</th>
              <th style={{ padding: '1rem' }}>Control</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem', color: 'var(--text-bright)' }}>{user.email}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={`status-badge ${user.role === 'superadmin' ? 'bg-urgent' : user.role === 'admin' ? 'bg-monitor' : 'bg-normal'}`} style={{ fontSize: '0.75rem' }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>{user.last_activity === "Never" ? "Never" : new Date(user.last_activity).toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="status-badge" style={{ background: 'transparent', border: '1px solid var(--card-border)', cursor: 'pointer', fontSize: '0.7rem' }}>Restrict</button>
                    <button className="status-badge" style={{ background: 'transparent', border: '1px solid var(--urgent)', color: 'var(--urgent)', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {isMobile && (
        <BottomNavigation 
          activeTab="superadmin" 
          onTabChange={handleTabChange} 
          isSuperAdmin={true} 
        />
      )}
    </div>
  );
}
