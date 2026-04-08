"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, fetchMe } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useDeviceType } from "@/hooks/useDeviceType";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { isMobile } = useDeviceType();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
        await login(username, password);
      }
      try {
        const me = await fetchMe();
        localStorage.setItem("userId", String(me.id));
        localStorage.setItem("username", me.username);
        localStorage.setItem("userRole", me.role);
        localStorage.setItem("userEmail", me.email || "");
      } catch { /* non-blocking */ }
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    }
  };


  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="card glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '5rem 3rem', borderRadius: '40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
          <Logo height={isMobile ? "120px" : "180px"} />
          <p style={{ color: 'rgba(255, 230, 210, 0.5)', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '2rem', textAlign: 'center' }}>
            {isLogin ? "ADMINISTRATIVE ACCESS" : "ACCOUNT REGISTRATION"}
          </p>
        </div>
        
        {error && <div className="bg-urgent" style={{ padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="control-group" style={{ marginBottom: 0 }}>
            <label>{isLogin ? "Username or Email" : "Username"}</label>
            <input 
              type="text" 
              required
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              style={{ width: '100%' }}
            />
          </div>
          {!isLogin && (
            <div className="control-group" style={{ marginBottom: 0 }}>
              <label>Email Address</label>
              <input 
                type="email" 
                required
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
          )}
          <div className="control-group" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input 
              type="password" 
              required
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ width: '100%' }}
            />
          </div>
          <button 
            type="submit" 
            style={{ 
              marginTop: '1rem', padding: '0.75rem', background: 'var(--text-main)', 
              color: 'var(--surface)', border: 'none', borderRadius: '6px', 
              fontWeight: 600, cursor: 'pointer' 
            }}
          >
            {isLogin ? "Sign In" : "Register"}
          </button>
        </form>
        
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : "Already registered? "}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
          >
            {isLogin ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
