import React from 'react';
import { Home, Share2, MapPin, ShieldAlert, FlaskConical, LogOut } from 'lucide-react';

interface NavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSuperAdmin?: boolean;
}

export function BottomNavigation({ activeTab, onTabChange, isSuperAdmin }: NavProps) {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'network', icon: Share2, label: 'Network' },
    { id: 'location', icon: MapPin, label: 'Location' },
    ...(isSuperAdmin ? [{ id: 'testing', icon: FlaskConical, label: 'Testing' }] : []),
    ...(isSuperAdmin ? [{ id: 'superadmin', icon: ShieldAlert, label: 'Command' }] : []),
    { id: 'logout', icon: LogOut, label: 'Logout' }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom)',
      /* Ensure it's hidden on larger screens if desired, but Dashboard usually handles the md check */
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '64px', padding: '0 8px' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                gap: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: isActive ? '#f59e0b' : 'rgba(255, 255, 255, 0.4)'
              }}
            >
              <div
                style={{
                  padding: '6px',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <tab.icon size={20} />
              </div>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 500, 
                letterSpacing: '0.02em',
                opacity: isActive ? 1 : 0.6
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
