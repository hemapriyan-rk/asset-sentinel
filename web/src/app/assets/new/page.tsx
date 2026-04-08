"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAsset, createConnection, fetchAssets, AssetMeta } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useDeviceType } from "@/hooks/useDeviceType";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  // Step 1 – Identity
  id: string;
  name: string;
  description: string;
  asset_type: string;
  // Location
  site: string;
  building: string;
  floor: string;
  zone: string;
  panel: string;
  // Step 2 – Electrical Specs
  rated_voltage: string;
  rated_current: string;
  rated_power: string;
  frequency: string;
  // Connectivity
  upstream_source_id: string;
  connection_type: string;
  feeder_id: string;
  // Operational Limits
  max_temperature: string;
  max_load_pct: string;
  voltage_tolerance: string;
  current_limit: string;
  // Step 3 – Baseline Telemetry
  baseline_rms_voltage: string;
  baseline_rms_current: string;
  baseline_real_power: string;
  baseline_surface_temperature: string;
  baseline_ambient_temperature: string;
  baseline_duty_cycle: string;
  // Sensor Config
  sampling_rate: string;
  data_source: string;
  voltage_sensor_id: string;
  current_sensor_id: string;
}

const INITIAL_FORM: FormData = {
  id: "", name: "", description: "", asset_type: "LOAD",
  site: "", building: "", floor: "", zone: "", panel: "",
  rated_voltage: "", rated_current: "", rated_power: "", frequency: "50",
  upstream_source_id: "", connection_type: "DIRECT", feeder_id: "",
  max_temperature: "", max_load_pct: "100", voltage_tolerance: "", current_limit: "",
  baseline_rms_voltage: "220", baseline_rms_current: "10",
  baseline_real_power: "2200", baseline_surface_temperature: "25",
  baseline_ambient_temperature: "25", baseline_duty_cycle: "1.0",
  sampling_rate: "", data_source: "IoT Gateway",
  voltage_sensor_id: "", current_sensor_id: "",
};

const STEPS = ["Asset Setup", "Electrical Config", "Data & Baseline"];

// ─── These helpers MUST live at module scope (outside NewAssetPage). ─────────
// If defined inside the component, React creates a new function reference every
// render → treats Field as a brand-new component type → unmounts the <input>
// after every keystroke, losing focus and resetting cursor position.

interface FieldProps {
  label: string;
  field: keyof FormData;
  value: string;
  onChange: (field: keyof FormData, value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

function Field({ label, field, value, onChange, error, type = "text", placeholder = "", required = false }: FieldProps) {
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
  const { isMobile } = useDeviceType();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingAssets, setExistingAssets] = useState<AssetMeta[]>([]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    fetchAssets().then(setExistingAssets).catch(() => {});
  }, [router]);

  const set = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  // ─── Validation per step ────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.id.trim()) e.id = "Asset ID is required.";
      if (!form.name.trim()) e.name = "Asset Name is required.";
      if (!form.site.trim()) e.site = "Site is required.";
    }
    if (s === 1) {
      if (!form.rated_voltage || Number(form.rated_voltage) <= 0) e.rated_voltage = "Required, must be > 0.";
      if (!form.rated_current || Number(form.rated_current) <= 0) e.rated_current = "Required, must be > 0.";
      if (!form.rated_power || Number(form.rated_power) <= 0) e.rated_power = "Required, must be > 0.";
      if (!form.frequency || Number(form.frequency) <= 0) e.frequency = "Required, must be > 0.";
      if (!form.upstream_source_id) e.upstream_source_id = "Upstream source is required.";
      if (form.upstream_source_id === form.id) e.upstream_source_id = "Asset cannot connect to itself.";
      if (Number(form.max_load_pct) > 150) e.max_load_pct = "Max Load % must be ≤ 150%.";
    }
    if (s === 2) {
      const hasAny = [
        form.baseline_rms_voltage, form.baseline_rms_current, form.baseline_real_power,
        form.baseline_surface_temperature, form.baseline_ambient_temperature, form.baseline_duty_cycle,
      ].some(v => v.trim() !== "");
      if (!hasAny) e.telemetry = "At least one telemetry baseline field is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => s + 1); };
  const prevStep = () => { setStep(s => s - 1); setErrors({}); };

  const handleFinish = async () => {
    if (!validateStep(2)) return;
    setSubmitting(true);
    setGlobalError("");
    try {
      const payload = {
        id: form.id.trim(),
        name: form.name.trim(),
        description: form.description || undefined,
        asset_type: form.asset_type,
        site: form.site || undefined,
        building: form.building || undefined,
        floor: form.floor || undefined,
        zone: form.zone || undefined,
        panel: form.panel || undefined,
        rated_voltage: form.rated_voltage ? Number(form.rated_voltage) : undefined,
        rated_current: form.rated_current ? Number(form.rated_current) : undefined,
        rated_power: form.rated_power ? Number(form.rated_power) : undefined,
        frequency: form.frequency ? Number(form.frequency) : undefined,
        max_temperature: form.max_temperature ? Number(form.max_temperature) : undefined,
        max_load_pct: Number(form.max_load_pct) || 100,
        voltage_tolerance: form.voltage_tolerance ? Number(form.voltage_tolerance) : undefined,
        current_limit: form.current_limit ? Number(form.current_limit) : undefined,
        baseline_rms_voltage: Number(form.baseline_rms_voltage) || 220,
        baseline_rms_current: Number(form.baseline_rms_current) || 10,
        baseline_real_power: Number(form.baseline_real_power) || 2200,
        baseline_surface_temperature: Number(form.baseline_surface_temperature) || 25,
        baseline_ambient_temperature: Number(form.baseline_ambient_temperature) || 25,
        baseline_duty_cycle: Number(form.baseline_duty_cycle) || 1.0,
        sampling_rate: form.sampling_rate ? Number(form.sampling_rate) : undefined,
        data_source: form.data_source || undefined,
        voltage_sensor_id: form.voltage_sensor_id || undefined,
        current_sensor_id: form.current_sensor_id || undefined,
      };

      await createAsset(payload);
      await createConnection({
        parent_asset_id: form.upstream_source_id,
        child_asset_id: form.id.trim(),
        connection_type: form.connection_type,
        feeder_id: form.feeder_id || undefined,
      });

      router.push("/network");
    } catch (err: any) {
      setGlobalError(err.message || "Initialization failed.");
    } finally {
      setSubmitting(false);
    }
  };


  // ─── Render ──────────────────────────────────────────────────────────────────
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
          <span style={{ fontSize: '1.5rem', fontWeight: 400, opacity: 0.8 }}>Asset Initialization</span>
        </div>
        <button onClick={() => router.push("/")} className="status-badge" style={{ cursor: 'pointer', background: 'transparent' }}>
          Cancel
        </button>
      </header>

      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', maxWidth: 800, margin: '1.5rem auto 0', padding: '0 1rem' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              padding: '0.6rem 1rem',
              borderRadius: 32,
              background: i === step ? 'var(--glass)' : i < step ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
              border: `1px solid ${i === step ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
              fontSize: '0.85rem',
              fontWeight: i === step ? 700 : 400,
              color: i < step ? 'rgba(255,255,255,0.5)' : '#fff',
              transition: 'all 0.3s',
            }}>
              {i < step ? '✓ ' : `${i + 1}. `}{s}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ position: 'absolute', display: 'none' }} />
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 800, margin: '1.5rem auto' }}>
        {globalError && (
          <div className="bg-urgent status-badge" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'block', textAlign: 'center' }}>
            {globalError}
          </div>
        )}

        {/* ─── STEP 1 ───────────────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <SectionDivider title="Asset Identity" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="Asset ID" field="id" value={form.id} onChange={set} error={errors.id} placeholder="e.g. MTR-001" required />
              <Field label="Asset Name" field="name" value={form.name} onChange={set} error={errors.name} placeholder="e.g. Primary Conveyor Motor" required />
              <div className="control-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description (Optional)</label>
                <input type="text" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div className="control-group">
                <label>Asset Type</label>
                <select value={form.asset_type} onChange={e => set('asset_type', e.target.value)}>
                  <option value="LOAD">Load</option>
                  <option value="DISTRIBUTION">Distribution</option>
                  <option value="TRANSFORMER">Transformer</option>
                  <option value="SOURCE">Source</option>
                </select>
              </div>
            </div>

            <SectionDivider title="Physical Location" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="Site" field="site" value={form.site} onChange={set} error={errors.site} placeholder="e.g. Main Plant" required />
              <Field label="Building" field="building" value={form.building} onChange={set} placeholder="e.g. Building A" />
              <Field label="Floor" field="floor" value={form.floor} onChange={set} placeholder="e.g. Floor 2" />
              <Field label="Zone" field="zone" value={form.zone} onChange={set} placeholder="e.g. Zone B" />
              <Field label="Panel / Feeder" field="panel" value={form.panel} onChange={set} placeholder="e.g. Panel P12" />
            </div>
          </>
        )}

        {/* ─── STEP 2 ───────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <SectionDivider title="Electrical Specifications" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="Rated Voltage (V)" field="rated_voltage" value={form.rated_voltage} onChange={set} error={errors.rated_voltage} type="number" required />
              <Field label="Rated Current (A)" field="rated_current" value={form.rated_current} onChange={set} error={errors.rated_current} type="number" required />
              <Field label="Rated Power (W)" field="rated_power" value={form.rated_power} onChange={set} error={errors.rated_power} type="number" required />
              <Field label="Frequency (Hz)" field="frequency" value={form.frequency} onChange={set} error={errors.frequency} type="number" required />
            </div>

            <SectionDivider title="Electrical Connectivity" />
            <div style={{
              border: '1px solid rgba(255,200,100,0.4)',
              borderRadius: 20,
              padding: '1.25rem',
              background: 'rgba(255,180,50,0.05)',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="control-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Upstream Source <span style={{ color: 'var(--urgent)' }}>*</span></label>
                  <select
                    value={form.upstream_source_id}
                    onChange={e => set('upstream_source_id', e.target.value)}
                    style={errors.upstream_source_id ? { borderColor: 'var(--urgent)' } : {}}
                  >
                    <option value="">— Select upstream source —</option>
                    {existingAssets
                      .filter(a => a.id !== form.id)
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                      ))}
                  </select>
                  {errors.upstream_source_id && (
                    <div style={{ color: 'var(--urgent)', fontSize: '0.8rem', marginTop: 4 }}>{errors.upstream_source_id}</div>
                  )}
                </div>
                <div className="control-group">
                  <label>Connection Type</label>
                  <select value={form.connection_type} onChange={e => set('connection_type', e.target.value)}>
                    <option value="DIRECT">Direct</option>
                    <option value="FEEDER">Feeder</option>
                    <option value="BUS">Bus</option>
                    <option value="BREAKER">Breaker</option>
                  </select>
                </div>
                <Field label="Feeder ID (Optional)" field="feeder_id" value={form.feeder_id} onChange={set} placeholder="e.g. FDR-07" />
              </div>
              {form.upstream_source_id && form.name && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  <strong>{existingAssets.find(a => a.id === form.upstream_source_id)?.name || form.upstream_source_id}</strong>
                  <span style={{ margin: '0 0.75rem', opacity: 0.5 }}>→</span>
                  <strong>{form.name || form.id}</strong>
                  <span style={{ marginLeft: '0.75rem', opacity: 0.5, fontSize: '0.8rem' }}>via {form.connection_type}</span>
                </div>
              )}
            </div>

            <SectionDivider title="Operational Limits" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="Max Temperature (°C)" field="max_temperature" value={form.max_temperature} onChange={set} type="number" />
              <Field label="Max Load %" field="max_load_pct" value={form.max_load_pct} onChange={set} type="number" />
              <Field label="Voltage Tolerance (%)" field="voltage_tolerance" value={form.voltage_tolerance} onChange={set} type="number" />
              <Field label="Current Limit (A)" field="current_limit" value={form.current_limit} onChange={set} type="number" />
            </div>
          </>
        )}

        {/* ─── STEP 3 ───────────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <SectionDivider title="Baseline Telemetry" />
            {errors.telemetry && (
              <div style={{ color: 'var(--urgent)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{errors.telemetry}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <Field label="RMS Voltage (V)" field="baseline_rms_voltage" value={form.baseline_rms_voltage} onChange={set} type="number" />
              <Field label="RMS Current (A)" field="baseline_rms_current" value={form.baseline_rms_current} onChange={set} type="number" />
              <Field label="Real Power (W)" field="baseline_real_power" value={form.baseline_real_power} onChange={set} type="number" />
              <Field label="Surface Temp (°C)" field="baseline_surface_temperature" value={form.baseline_surface_temperature} onChange={set} type="number" />
              <Field label="Ambient Temp (°C)" field="baseline_ambient_temperature" value={form.baseline_ambient_temperature} onChange={set} type="number" />
              <Field label="Duty Cycle (0–1)" field="baseline_duty_cycle" value={form.baseline_duty_cycle} onChange={set} type="number" />
            </div>

            <SectionDivider title="Sensor & Data Configuration" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="Sampling Rate (s)" field="sampling_rate" value={form.sampling_rate} onChange={set} type="number" />
              <div className="control-group">
                <label>Data Source</label>
                <select value={form.data_source} onChange={e => set('data_source', e.target.value)}>
                  <option>IoT Gateway</option>
                  <option>SCADA</option>
                  <option>API</option>
                </select>
              </div>
              <Field label="Voltage Sensor ID (Optional)" field="voltage_sensor_id" value={form.voltage_sensor_id} onChange={set} />
              <Field label="Current Sensor ID (Optional)" field="current_sensor_id" value={form.current_sensor_id} onChange={set} />
            </div>
          </>
        )}

        {/* ─── Navigation ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: '1rem' }}>
          {step > 0 ? (
            <button onClick={prevStep} className="status-badge" style={{ cursor: 'pointer', padding: '0.75rem 1.5rem' }}>
              ← Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button onClick={nextStep} className="primary-btn" style={{ padding: '0.75rem 2rem' }}>
              Next: {STEPS[step + 1]} →
            </button>
          ) : (
            <button onClick={handleFinish} disabled={submitting} className="primary-btn" style={{ padding: '0.75rem 2rem' }}>
              {submitting ? "Initializing…" : "Finish Initialization"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
