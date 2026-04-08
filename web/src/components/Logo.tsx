import React from 'react';

export function Logo({ className = "", height = "80px" }) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img 
        src="/logo.png" 
        alt="AssetSentinel Logo" 
        style={{ 
          height: height, 
          width: 'auto',
          filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.4))',
          display: 'block',
          transition: 'all 0.3s ease'
        }} 
      />
    </div>
  );
}
