"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchUsers, API_URL, AssetMeta, fetchAssets } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useDeviceType } from "@/hooks/useDeviceType";

const INITIAL_FORM = {
  rated_voltage: "",
  rated_current: "",
  rated_power: "",
  frequency: "",
  max_temperature: "",
  max_load_pct: "",
  voltage_tolerance: "",
  current_limit: "",
  baseline_rms_voltage: "",
  baseline_rms_current: "",
  baseline_real_power: "",
  baseline_surface_temperature: "",
  baseline_ambient_temperature: "",
  baseline_duty_cycle: "",
  sampling_rate: "",
  data_source: "",
  voltage_sensor_id: "",
  current_sensor_id: ""
};

// ─── Shared Inputs (outside component to prevent remount) ───────────────────
interface FieldProps {
  label: string;
  field: string;
  value: string;
  onChange: (field: string, value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  max?: string;
}

function Field({ label, field, value, onChange, error, type = "text", placeholder = "", required = false, step, max }: FieldProps) {
  return (
    <div className="control-group">
      <label>{label}{required && <span style={{ color: 'var(--urgent)', marginLeft: 4 }}>*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        style={error ? { borderColor: 'var(--urgent)' } : {}}
      />
      {error && <div style={{ color: 'var(--urgent)', fontSize: '0.8rem', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <h3 style={{ margin: '1.5rem 0 1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', fontSize: '1rem', opacity: 0.8 }}>
      {title}
    </h3>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NewAssetPage() {
  const router = useRouter();
  const params = useParams();
  const { isMobile } = useDeviceType();
  const [step, setStep] = useState(0);
  const assetId = params.id as string;

  const [form, setForm] = useState<Record<string, string>>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assetName, setAssetName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    // Fetch existing asset details
    fetch(`${API_URL}/assets`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const asset = data.find((a: any) => a.id === assetId);
        if (!asset) {
          setGlobalError("Asset not found or access denied.");
          setLoading(false);
          return;
        }
        setAssetName(asset.name);
        
        // Populate form with existing values, converting nulls/undefined to empty strings
        const populate: Record<string, string> = {};
        Object.keys(INITIAL_FORM).forEach(k => {
          populate[k] = asset[k] != null ? String(asset[k]) : "";
        });
        setForm(populate);
        setLoading(false);
      })
      .catch(err => {
        setGlobalError("Failed to fetch asset details.");
        setLoading(false);
      });
  }, [assetId, router]);

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    
    // Strict numeric validation where applicable
    if (form.max_load_pct && Number(form.max_load_pct) > 150) e.max_load_pct = "Max Load % must be ≤ 150%.";
    if (form.rated_voltage && Number(form.rated_voltage) < 0) e.rated_voltage = "Cannot be negative.";
    if (form.rated_current && Number(form.rated_current) < 0) e.rated_current = "Cannot be negative.";
    if (form.rated_power && Number(form.rated_power) < 0) e.rated_power = "Cannot be negative.";
    if (form.frequency && Number(form.frequency) < 0) e.frequency = "Cannot be negative.";
    if (form.baseline_duty_cycle && (Number(form.baseline_duty_cycle) < 0 || Number(form.baseline_duty_cycle) > 1)) {
        e.baseline_duty_cycle = "Duty cycle must be between 0.0 and 1.0";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setGlobalError("");
    
    try {
      const payload: Record<string, any> = {};
      
      // Clean up payload: convert empty strings to null or numbers
      Object.keys(form).forEach(k => {
        const val = form[k].trim();
        if (val === "") {
            payload[k] = null;
        } else if (k.includes("id") || k === "data_source") {
            payload[k] = val; // strings
        } else {
            payload[k] = Number(val); // numbers
        }
      });

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/assets/${assetId}`, {
        method: "PUT",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update asset.");
      }

      router.push("/");
    } catch (err: any) {
      setGlobalError(err.message || "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading asset configuration...
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: isMobile ? '6rem' : '2rem' }}>
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
          <div>
            <span style={{ fontSize: '1.4rem', fontWeight: 600, opacity: 0.9 }}>Edit Configuration</span>
            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{assetName} ({assetId})</div>
          </div>
        </div>
        <button onClick={() => router.push("/")} className="status-badge" style={{ cursor: "pointer", background: "transparent" }}>
          ✕ Cancel
        </button>
      </header>

      <div className="layout" style={{ display: 'block' }}>
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255,255,255,0.02)' }}>
          {globalError && (
            <div className="status-badge bg-urgent" style={{ marginBottom: "1.5rem", width: "100%" }}>
              {globalError}
            </div>
          )}

          <SectionDivider title="Electrical Specifications" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Rated Voltage (V)" field="rated_voltage" type="number" value={form.rated_voltage} onChange={set} error={errors.rated_voltage} />
            <Field label="Rated Current (A)" field="rated_current" type="number" value={form.rated_current} onChange={set} error={errors.rated_current} />
            <Field label="Rated Power (kW)" field="rated_power" type="number" value={form.rated_power} onChange={set} error={errors.rated_power} />
            <Field label="Frequency (Hz)" field="frequency" type="number" value={form.frequency} onChange={set} error={errors.frequency} />
          </div>

          <SectionDivider title="Operational Limits" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Max Temperature (°C)" field="max_temperature" type="number" value={form.max_temperature} onChange={set} error={errors.max_temperature} />
            <Field label="Max Load Tolerance (%)" field="max_load_pct" type="number" value={form.max_load_pct} onChange={set} error={errors.max_load_pct} placeholder="e.g., 120" />
            <Field label="Voltage Tolerance (±V)" field="voltage_tolerance" type="number" value={form.voltage_tolerance} onChange={set} error={errors.voltage_tolerance} />
            <Field label="Hard Current Limit (A)" field="current_limit" type="number" value={form.current_limit} onChange={set} error={errors.current_limit} />
          </div>

          <SectionDivider title="Baseline Telemetry (Expected Nominals)" />
          <div style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '1rem' }}>
            Updating these values will affect future DI thresholds if the asset re-initializes its historical bounds.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Baseline RMS Voltage (V)" field="baseline_rms_voltage" type="number" value={form.baseline_rms_voltage} onChange={set} />
            <Field label="Baseline RMS Current (A)" field="baseline_rms_current" type="number" value={form.baseline_rms_current} onChange={set} />
            <Field label="Baseline Real Power (kW)" field="baseline_real_power" type="number" value={form.baseline_real_power} onChange={set} />
            <Field label="Baseline Surface Temp (°C)" field="baseline_surface_temperature" type="number" value={form.baseline_surface_temperature} onChange={set} />
            <Field label="Baseline Ambient Temp (°C)" field="baseline_ambient_temperature" type="number" value={form.baseline_ambient_temperature} onChange={set} />
            <Field label="Baseline Duty Cycle (0-1)" field="baseline_duty_cycle" type="number" step="0.01" max="1" value={form.baseline_duty_cycle} onChange={set} error={errors.baseline_duty_cycle}/>
          </div>

          <SectionDivider title="Sensor Map" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Data Source / Gateway" field="data_source" value={form.data_source} onChange={set} />
            <Field label="Sampling Rate (Hz)" field="sampling_rate" type="number" value={form.sampling_rate} onChange={set} />
            <Field label="Voltage Sensor ID" field="voltage_sensor_id" value={form.voltage_sensor_id} onChange={set} />
            <Field label="Current Sensor ID" field="current_sensor_id" value={form.current_sensor_id} onChange={set} />
          </div>

          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button onClick={() => router.push("/")} className="status-badge" style={{ background: 'transparent' }} disabled={submitting}>
              Cancel
            </button>
            <button onClick={handleSave} className="status-badge bg-normal" disabled={submitting}>
              {submitting ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
