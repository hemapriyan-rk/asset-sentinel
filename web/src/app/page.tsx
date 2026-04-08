"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchAssets, analyzeAsset, AnalysisResponse, AssetMeta, API_URL } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useDeviceType } from "@/hooks/useDeviceType";
import { KPIGrid } from "@/components/KPIGrid";
import { DegradationChart } from "@/components/DegradationChart";

export default function Dashboard() {
  const router = useRouter();
  const { isMobile } = useDeviceType();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [assets, setAssets] = useState<AssetMeta[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [tempIncrease, setTempIncrease] = useState<number>(0);
  const [voltIncrease, setVoltIncrease] = useState<number>(0);
  const [dutyIncrease, setDutyIncrease] = useState<number>(0);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorVisible, setErrorVisible] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showDemoPopup, setShowDemoPopup] = useState<boolean>(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }

    const role = localStorage.getItem("userRole");
    const email = localStorage.getItem("userEmail");
    setUserRole(role);
    setUserEmail(email);

    if (email === "demo@assetsentinel.com" && !localStorage.getItem("demo_popup_seen")) {
      setShowDemoPopup(true);
    }

    fetchAssets().then(fetchedAssets => {
      setAssets(fetchedAssets);
      if (fetchedAssets.length > 0) setSelectedAsset(fetchedAssets[0].id);
    }).catch(err => {
      console.error(err);
      if (err.message.includes("auth")) router.push("/login");
    });

    // Background Health Check (Every 15 seconds like Adaptive Task Planner)
    const healthInterval = setInterval(() => {
      fetch(`${API_URL}/health`).then(res => setIsBackendOnline(res.ok)).catch(() => setIsBackendOnline(false));
    }, 15000);

    return () => clearInterval(healthInterval);
  }, [router]);

  useEffect(() => {
    if (!selectedAsset) return;
    
    const timer = setTimeout(() => {
      setLoading(true);
      setErrorVisible(null);
      analyzeAsset(selectedAsset, tempIncrease, voltIncrease, dutyIncrease).then(setData)
        .catch(err => {
          console.error(err);
          setErrorVisible(err.message);
        })
        .finally(() => setLoading(false));
    }, 300);
    
    return () => clearTimeout(timer);
  }, [selectedAsset, tempIncrease, voltIncrease, dutyIncrease]);

  const getStateClass = (state: string) => {
    switch (state) {
      case "CRITICAL": return "bg-urgent";
      case "WARNING": return "bg-monitor";
      default: return "bg-normal";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("demo_popup_seen");
    router.push("/login");
  };

  const closeDemoPopup = () => {
    setShowDemoPopup(false);
    localStorage.setItem("demo_popup_seen", "true");
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === 'logout') {
      handleLogout();
    } else if (tabId === 'network') {
      router.push('/network');
    } else if (tabId === 'location') {
      router.push('/location');
    } else if (tabId === 'testing') {
      router.push('/testing');
    } else if (tabId === 'superadmin') {
      router.push('/superadmin');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: isMobile ? '5rem' : '2rem' }}>
      <header className="header" style={{ 
        padding: '0.5rem 0', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '3rem'
      }}>
        <Logo height={isMobile ? "60px" : "100px"} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {!isBackendOnline && (
            <div className="status-badge bg-urgent pulse" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
              Offline
            </div>
          )}

          {!isMobile && (
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
              <div style={{ textAlign: "right", borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: "1.5rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", opacity: 0.9 }}>{userEmail}</div>
                <div style={{ fontSize: "0.75rem", color: "#f59e0b", textTransform: "uppercase", letterSpacing: '0.1em', marginTop: '2px', fontWeight: 600 }}>{userRole}</div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {userRole === "superadmin" && (
                  <button 
                    onClick={() => router.push("/superadmin")} 
                    className="status-badge bg-urgent pulse-subtle" 
                    style={{ cursor: "pointer", border: "1px solid #f59e0b", display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}>
                    🛡️ Command Center
                  </button>
                )}
                {userRole === "superadmin" && (
                  <button
                    onClick={() => router.push("/testing")}
                    className="status-badge"
                    style={{ cursor: 'pointer', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#bae6fd', fontWeight: 700 }}
                  >
                    Testing
                  </button>
                )}
                <button 
                  onClick={() => router.push("/assets/new")} 
                  className="status-badge bg-normal" 
                  style={{ cursor: "pointer", fontWeight: 700, padding: '0.6rem 1.6rem' }}>
                  + Create
                </button>
                
                <div style={{ height: '32px', width: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0.5rem' }}></div>
                
                <button onClick={() => router.push("/network")} className="status-badge" style={{ cursor: 'pointer', opacity: 0.9, background: 'transparent', border: 'none', fontSize: '0.85rem' }}>Network</button>
                <button onClick={() => router.push("/location")} className="status-badge" style={{ cursor: 'pointer', opacity: 0.9, background: 'transparent', border: 'none', fontSize: '0.85rem' }}>Location</button>
                <button 
                  onClick={handleLogout} 
                  className="status-badge" 
                  style={{ 
                    cursor: "pointer", 
                    background: "rgba(239, 68, 68, 0.15)", 
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    marginLeft: '0.75rem',
                    fontWeight: 600
                  }}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Navigation handled by BottomNavigation below */}

      <div className="layout" style={isMobile ? { display: 'flex', flexDirection: 'column' } : {}}>
        {/* SIDEBAR / CONTROLS */}
        <aside className="card border-0" style={{ padding: '1.25rem', height: 'fit-content' }}>
          
          <div className="control-group" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ margin: 0 }}>Target Asset</label>
              {selectedAsset && (
                <button 
                  onClick={() => router.push(`/assets/${selectedAsset}/edit`)}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer', opacity: 0.8 }}
                >
                  Edit Config ⚙
                </button>
              )}
            </div>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px', background: 'rgba(0, 0, 0, 0.2)', color: '#fff', cursor: 'pointer',
                backdropFilter: 'blur(10px)'
              }}
            >
              {selectedAsset 
                ? assets.find(a => a.id === selectedAsset)?.name || selectedAsset 
                : "Select Asset..."}
              <span style={{ float: 'right', opacity: 0.5 }}>▼</span>
            </div>
            
            {isDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem',
                background: 'rgba(30, 8, 2, 0.95)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', zIndex: 100,
                maxHeight: '250px', overflowY: 'auto', padding: '0.5rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search assets..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  style={{ marginBottom: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={e => e.stopPropagation()}
                />
                
                {assets.length === 0 && <div style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>No assets found</div>}
                
                {assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                  <div 
                    key={a.id} 
                    onClick={() => { setSelectedAsset(a.id); setIsDropdownOpen(false); setSearchQuery(""); }}
                    style={{
                      padding: '0.75rem', cursor: 'pointer', borderRadius: '8px',
                      background: selectedAsset === a.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: '#fff', transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedAsset === a.id ? 'rgba(255,255,255,0.1)' : 'transparent'}
                  >
                    <div style={{ fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{a.id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border)' }} />
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Simulation Stressors</h4>

          <div className="control-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Temperature (Δ°C)</span>
              <strong>+{tempIncrease}</strong>
            </label>
            <input type="range" min="0" max="25" step="1" value={tempIncrease} onChange={(e) => setTempIncrease(parseFloat(e.target.value))} />
          </div>

          <div className="control-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Voltage Spikes (ΔV)</span>
              <strong>+{voltIncrease}</strong>
            </label>
            <input type="range" min="0" max="50" step="1" value={voltIncrease} onChange={(e) => setVoltIncrease(parseFloat(e.target.value))} />
          </div>

          <div className="control-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Duty Cycle Boost (Δ%)</span>
              <strong>+{dutyIncrease.toFixed(2)}</strong>
            </label>
            <input type="range" min="0" max="0.5" step="0.01" value={dutyIncrease} onChange={(e) => setDutyIncrease(parseFloat(e.target.value))} />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main>
          {loading && <p style={{ color: 'var(--text-muted)' }}>Synching telemetry...</p>}
          {errorVisible && !loading && (
            <div className="card" style={{ borderLeft: '4px solid var(--urgent)', padding: '1rem', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.1)' }}>
              <div style={{ color: 'var(--urgent)', fontWeight: 600, marginBottom: '0.2rem' }}>Connection Issue</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{errorVisible}</div>
            </div>
          )}
          
          {data && (
            <>
              <KPIGrid kpis={data.kpis} />

              <div className="card">
                <div className="header" style={{ border: 'none', padding: 0, marginBottom: '1rem', display: 'flex' }}>
                  <div className="kpi-label" style={{ margin: 0 }}>Degradation Trajectory Viewer</div>
                  {data && <div className={`status-badge ${getStateClass(data.kpis.state)}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}>{data.kpis.state}</div>}
                </div>
                
                <DegradationChart 
                  timeline={data.timeline} 
                  warningThreshold={data.thresholds.warning} 
                  criticalThreshold={data.thresholds.critical} 
                  loading={loading} 
                />
              </div>
            </>
          )}
        </main>
      </div>
      {showDemoPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(8px)'
        }}>
          <div className="card" style={{ maxWidth: '500px', border: '1px solid var(--accent)', textAlign: 'center', padding: '2.5rem' }}>
            <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>⚠️ SuperAdmin Notice</h2>
            <p style={{ color: 'var(--text-bright)', fontSize: '1.1rem', lineHeight: '1.6' }}>
              Don't initialize any unwanted assets. For that, please create a new admin.
            </p>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
              If you need to create one, contact: <br/>
              <strong style={{ color: 'var(--text-bright)' }}>admin@assetsentinel.com</strong>
            </p>
            <button 
              onClick={closeDemoPopup}
              className="status-badge bg-normal" 
              style={{ marginTop: '2rem', padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer' }}
            >
              I Understand
            </button>
          </div>
        </div>
      )}
      {isMobile && (
        <BottomNavigation 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          isSuperAdmin={userRole === "superadmin"}
        />
      )}
    </div>
  );
}
