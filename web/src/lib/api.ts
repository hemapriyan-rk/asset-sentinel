// Always use a relative /api path so calls go through Next.js rewrite proxy (local dev)
// or tunnel-proxy.js (Cloudflare tunnel) — avoids Mixed Content and CORS errors.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ---- KPI / Analysis Types ----
export interface KPI {
  state: string;
  degradation: number;
  acceleration: number;
  top_cause: string;
  trend: string;
  confidence: string;
}

export interface Thresholds {
  baseline: number;
  warning: number;
  critical: number;
  mu_baseline?: number;
  sigma_baseline?: number;
  smoothing_window?: number;
  baseline_autotuned?: boolean;
}

export interface TimelineRecord {
  timestamp: string;
  D: number;
  raw_signal?: number;
  acc: number;
  state_final: string;
  [key: string]: any;
}

export interface AnalysisResponse {
  asset_id: string;
  kpis: KPI;
  thresholds: Thresholds;
  timeline: TimelineRecord[];
}

export interface SimulationParameterBound {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  default: number;
}

export interface SimulationAssetProfile {
  asset_type: string;
  display_name: string;
  parameters: SimulationParameterBound[];
}

export interface SimulationProfilesResponse {
  profiles: SimulationAssetProfile[];
}

export interface DegradationPoint {
  timestamp: string;
  di: number;
  state: string;
}

export interface SensitivityPoint {
  name: string;
  contribution: number;
}

export interface FailureTrajectoryPoint {
  hour: number;
  di: number;
  prob_critical: number;
}

export interface ComponentRating {
  score: number;
  label: string;
}

export interface RULEstimate {
  hours?: number | null;
  confidence: string;
  reason: string;
}

export interface SimulationResponse {
  asset_id: string;
  asset_type: string;
  degradation_index: number;
  health_category: string;
  confidence_score: number;
  confidence_label: string;
  recommended_action: string;
  component_rating: ComponentRating;
  rul: RULEstimate;
  degradation_curve: DegradationPoint[];
  parameter_sensitivity: SensitivityPoint[];
  failure_trajectory: FailureTrajectoryPoint[];
  timeline?: TimelineRecord[];
  thresholds?: Thresholds;
}

// ---- Asset Types ----
export type LoginResponse = {
  access_token: string;
  token_type: string;
  email: string;
  role: string;
};
export interface AssetMeta {
  id: string;
  name: string;
  asset_type?: string;
  site?: string;
  building?: string;
  floor?: string;
  zone?: string;
  panel?: string;
}

// ---- Network Types ----
export interface NetworkNode {
  id: string;
  name: string;
  asset_type: string;
  site?: string;
  building?: string;
  floor?: string;
  zone?: string;
  panel?: string;
  rated_power?: number;
  max_load_pct?: number;
  current_load?: number;
  load_pct?: number;
  network_state?: string;
}

export interface NetworkEdge {
  id: number;
  parent_asset_id: string;
  child_asset_id: string;
  connection_type: string;
  feeder_id?: string;
}

export interface NetworkResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

// ---- Auth Helpers ----
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---- Auth Functions ----
export async function login(username: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  }).catch(err => {
    console.error("API Fetch Error:", err);
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      console.warn("TIP: If you are accessing via a tunnel, ensure your NEXT_PUBLIC_API_URL is set to the public backend URL.");
    }
    throw new Error(`Cloud connection failed. Ensure backend tunnel is active at ${API_URL}`);
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
    throw new Error(err.detail || 'Login failed');
  }

  const data: LoginResponse = await res.json();
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('userEmail', data.email);
  localStorage.setItem('userRole', data.role);
  return data;
}

export async function register(username: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
}

// ---- Asset Functions ----
export const fetchAssets = async (): Promise<AssetMeta[]> => {
  const res = await fetch(`${API_URL}/assets`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('auth');
    throw new Error('Failed to fetch assets');
  }
  const data = await res.json();
  return data.assets;
};

export async function createAsset(assetData: any) {
  const res = await fetch(`${API_URL}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(assetData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Failed to create asset');
  }
  return res.json();
}

export async function createConnection(connData: {
  parent_asset_id: string;
  child_asset_id: string;
  connection_type: string;
  feeder_id?: string;
}) {
  const res = await fetch(`${API_URL}/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(connData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Failed to create connection');
  }
  return res.json();
}

export async function fetchMe(): Promise<{ id: number; username: string; role: string; email?: string }> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json();
}

export async function fetchUsers(): Promise<{ id: number; username: string; role: string }[]> {
  const res = await fetch(`${API_URL}/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  return data.users;
}

export async function fetchNetwork(ownerId?: number): Promise<NetworkResponse> {
  const url = ownerId ? `${API_URL}/network?owner_id=${ownerId}` : `${API_URL}/network`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch network');
  return res.json();
}

export async function fetchAssetParent(assetId: string) {
  const res = await fetch(`${API_URL}/assets/${assetId}/parent`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch parent');
  return res.json();
}

export async function fetchAssetChildren(assetId: string) {
  const res = await fetch(`${API_URL}/assets/${assetId}/children`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch children');
  return res.json();
}

// ---- Admin Functions ----
export interface SystemUser {
  id: number;
  username: string;
  email: string | null;
  role: string;
  last_activity: string;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  details?: string;
}

export interface SystemMetrics {
  total_users: number;
  active_deployments: number;
  node_uptime: string;
  api_latency: string;
  telemetry_points: number;
}

export async function fetchSystemUsers(): Promise<SystemUser[]> {
  const res = await fetch(`${API_URL}/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch system users');
  const data = await res.json();
  return data.users;
}

export async function fetchAuditLogs(limit: number = 50): Promise<AuditLogEntry[]> {
  const res = await fetch(`${API_URL}/admin/audit-logs?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  const data = await res.json();
  return data.logs;
}

export async function fetchAdminMetrics(): Promise<SystemMetrics> {
  const res = await fetch(`${API_URL}/admin/metrics`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

// ---- Analysis ----
export async function analyzeAsset(
  assetId: string,
  tempIncrease: number = 0,
  voltageIncrease: number = 0,
  dutyCycleIncrease: number = 0
): Promise<AnalysisResponse> {
  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      asset_id: assetId,
      temperature_increase: tempIncrease,
      voltage_increase: voltageIncrease,
      duty_cycle_increase: dutyCycleIncrease,
    }),
  });
  if (!res.ok) throw new Error('Failed to analyze asset');
  return res.json();
}

export async function fetchSimulationProfiles(): Promise<SimulationAssetProfile[]> {
  const res = await fetch(`${API_URL}/analyze/simulation-profiles`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch simulation profiles');
  const data: SimulationProfilesResponse = await res.json();
  return data.profiles;
}

export async function simulateAsset(request: {
  asset_id: string;
  asset_type: string;
  steps: number;
  temperature?: number;
  load_pct?: number;
  vibration?: number;
  oil_quality_index?: number;
  sag?: number;
  wind_load?: number;
  current_load?: number;
}): Promise<SimulationResponse> {
  const res = await fetch(`${API_URL}/analyze/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Simulation failed' }));
    throw new Error(err.detail || 'Simulation failed');
  }
  return res.json();
}
