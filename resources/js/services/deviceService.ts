// API_ENDPOINTS not needed — endpoints use native fetch paths

export interface Device {
  id: number;
  mac_address: string;
  station_id: string | null;
  name: string | null;
  status: 'awaiting_pair' | 'paired' | 'online' | 'offline';
  firmware_version: string | null;
  hardware_revision: string | null;
  paired_at: string | null;
  discovery_last_seen_at: string | null;
  last_seen_at: string | null;
  latitude: number | null;
  longitude: number | null;
  telemetry_count: number;
  paired_by_user: {
    id: number;
    firstName: string;
    lastName: string;
    organization: string | null;
  } | null;
  latest_telemetry: Telemetry | null;
  maintenance_schedule?: MaintenanceSchedule | null;
  anomaly_flags?: Array<{ reasons: string[]; recorded_at: string }> | null;
}

export interface Telemetry {
  id: number;
  device_id: number;
  recorded_at: string;
  received_at: string;
  latency_ms: number | null;
  temperature_celsius: number | null;
  ph: number | null;
  turbidity_ntu: number | null;
  tds_mg_l: number | null;
  water_level_cm: number | null;
  dissolved_oxygen_mg_l: number | null;
  conductivity_us_cm: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceSchedule {
  id: number;
  device_id: number;
  calibration_interval_days: number;
  reminder_days_before: number;
  last_calibrated_at: string | null;
  next_due_at: string | null;
  reminder_sent_at: string | null;
}

export interface ActivityLog {
  id: number;
  device_id: number;
  user_id: number | null;
  event_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

export interface MaintenanceLog {
  id: number;
  device_id: number;
  performed_by_user_id: number | null;
  maintenance_type: string;
  notes: string | null;
  performed_at: string;
  created_at: string;
}

export interface DailyMetrics {
  id: number;
  device_id: number;
  date: string;
  avg_ph: number | null;
  avg_tds_mg_l: number | null;
  avg_turbidity_ntu: number | null;
  avg_temp_celsius: number | null;
  min_ph: number | null;
  max_ph: number | null;
  min_tds_mg_l: number | null;
  max_tds_mg_l: number | null;
  min_turbidity_ntu: number | null;
  max_turbidity_ntu: number | null;
  reading_count: number;
}

export interface MonthlyMetrics {
  id: number;
  device_id: number;
  year_month: string;
  avg_ph: number | null;
  avg_tds_mg_l: number | null;
  avg_turbidity_ntu: number | null;
  avg_temp_celsius: number | null;
  min_ph: number | null;
  max_ph: number | null;
  min_tds_mg_l: number | null;
  max_tds_mg_l: number | null;
  min_turbidity_ntu: number | null;
  max_turbidity_ntu: number | null;
  reading_count: number;
}

export interface MapDevice {
  id: number;
  station_id: string | null;
  name: string | null;
  latitude: number;
  longitude: number;
  status: string;
  last_seen_at: string | null;
  latest_telemetry: Telemetry | null;
}

export interface LatencyMetrics {
  device_id: number;
  station_id: string | null;
  message_count: number;
  average_latency_ms: number | null;
  min_latency_ms: number | null;
  max_latency_ms: number | null;
  p50_latency_ms: number | null;
  p95_latency_ms: number | null;
  p99_latency_ms: number | null;
  std_dev_ms: number | null;
  period: {
    from: string | null;
    to: string | null;
  };
}

export interface HourlyTrend {
  hour: string;
  message_count: number;
  average_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
}

export interface DeliveryMetrics {
  period: {
    from: string;
    to: string;
    days: number;
  };
  expected_messages: number;
  actual_messages: number;
  delivery_rate_percent: number;
  missing_messages: number;
}

export interface PerformanceReport {
  device: {
    id: number;
    mac_address: string;
    station_id: string | null;
    status: string;
    paired_at: string | null;
  };
  period: {
    from: string;
    to: string;
    duration_days: number;
  };
  latency_metrics: LatencyMetrics;
  delivery_metrics: DeliveryMetrics;
  hourly_trends: HourlyTrend[];
  generated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

class DeviceService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async apiRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `API request failed with status ${response.status}`);
    }

    return response.json();
  }

  async listDevices(page = 1, perPage = 20, status?: string): Promise<PaginatedResponse<Device>> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    if (status) {
      params.append('status', status);
    }

    return this.apiRequest(`/api/devices?${params.toString()}`);
  }

  async listDiscoveredDevices(page = 1, perPage = 20): Promise<PaginatedResponse<Device>> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    return this.apiRequest(`/api/devices/discovered?${params.toString()}`);
  }

  async getDevice(deviceId: number): Promise<Device> {
    const response = await this.apiRequest(`/api/devices/${deviceId}`);
    return response.device;
  }

  async pairDevice(deviceId: number, stationId: string, name?: string, latitude?: number, longitude?: number): Promise<Device> {
    const response = await this.apiRequest(`/api/devices/${deviceId}/pair`, {
      method: 'POST',
      body: JSON.stringify({
        station_id: stationId,
        name: name || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      }),
    });
    return response.device;
  }

  async updateLocation(deviceId: number, latitude: number, longitude: number): Promise<Device> {
    const response = await this.apiRequest(`/api/devices/${deviceId}/location`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
    return response.device;
  }

  async calibrate(deviceId: number, notes?: string): Promise<{ log: MaintenanceLog; schedule: MaintenanceSchedule }> {
    return this.apiRequest(`/api/devices/${deviceId}/calibrate`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes || null }),
    });
  }

  async getMaintenance(deviceId: number): Promise<{ schedule: MaintenanceSchedule | null; logs: MaintenanceLog[] }> {
    return this.apiRequest(`/api/devices/${deviceId}/maintenance`);
  }

  async updateMaintenanceSchedule(deviceId: number, intervalDays: number, reminderDays: number): Promise<MaintenanceSchedule> {
    const response = await this.apiRequest(`/api/devices/${deviceId}/maintenance/schedule`, {
      method: 'PUT',
      body: JSON.stringify({
        calibration_interval_days: intervalDays,
        reminder_days_before: reminderDays,
      }),
    });
    return response.schedule;
  }

  async getActivityLogs(deviceId: number, page = 1, perPage = 20): Promise<PaginatedResponse<ActivityLog>> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    return this.apiRequest(`/api/devices/${deviceId}/activity-logs?${params.toString()}`);
  }

  async getOverdueDevices(): Promise<{ devices: Device[] }> {
    return this.apiRequest(`/api/devices/maintenance/overdue`);
  }

  async getUpcomingDevices(days = 14): Promise<{ devices: Device[] }> {
    return this.apiRequest(`/api/devices/maintenance/upcoming?days=${days}`);
  }

  async getDailyMetrics(deviceId: number, from?: string, to?: string): Promise<DailyMetrics[]> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return this.apiRequest(`/api/devices/${deviceId}/metrics/daily?${params.toString()}`);
  }

  async getMonthlyMetrics(deviceId: number, from?: string, to?: string): Promise<MonthlyMetrics[]> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return this.apiRequest(`/api/devices/${deviceId}/metrics/monthly?${params.toString()}`);
  }

  async deleteDevice(deviceId: number): Promise<void> {
    await this.apiRequest(`/api/devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  async getTelemetryHistory(deviceId: number, page = 1, perPage = 50): Promise<PaginatedResponse<Telemetry>> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    return this.apiRequest(`/api/devices/${deviceId}/telemetry?${params.toString()}`);
  }

  async requestLiveRead(deviceId: number): Promise<unknown> {
    return this.apiRequest(`/api/devices/${deviceId}/live-read`, {
      method: 'POST',
    });
  }

  async publishCommand(
    deviceId: number,
    commandType: 'pairing_confirmation' | 'live_read',
    payload?: Record<string, unknown>
  ): Promise<unknown> {
    return this.apiRequest(`/api/devices/${deviceId}/commands`, {
      method: 'POST',
      body: JSON.stringify({
        command_type: commandType,
        payload: payload || {},
      }),
    });
  }

  async getMapDevices(): Promise<MapDevice[]> {
    return this.apiRequest(`/api/devices/map`);
  }

  async getPerformanceMetrics(
    deviceId: number,
    from?: string,
    to?: string
  ): Promise<LatencyMetrics> {
    const params = new URLSearchParams({
      report_type: 'metrics',
    });

    if (from) params.append('from', from);
    if (to) params.append('to', to);

    return this.apiRequest(`/api/devices/${deviceId}/performance?${params.toString()}`);
  }

  async getPerformanceTrends(
    deviceId: number,
    from?: string,
    to?: string
  ): Promise<HourlyTrend[]> {
    const params = new URLSearchParams({
      report_type: 'trends',
    });

    if (from) params.append('from', from);
    if (to) params.append('to', to);

    return this.apiRequest(`/api/devices/${deviceId}/performance?${params.toString()}`);
  }

  async getDeliveryMetrics(
    deviceId: number,
    from?: string,
    to?: string
  ): Promise<DeliveryMetrics> {
    const params = new URLSearchParams({
      report_type: 'delivery',
    });

    if (from) params.append('from', from);
    if (to) params.append('to', to);

    return this.apiRequest(`/api/devices/${deviceId}/performance?${params.toString()}`);
  }

  async getFullPerformanceReport(
    deviceId: number,
    from?: string,
    to?: string
  ): Promise<PerformanceReport> {
    const params = new URLSearchParams({
      report_type: 'full',
    });

    if (from) params.append('from', from);
    if (to) params.append('to', to);

    return this.apiRequest(`/api/devices/${deviceId}/performance?${params.toString()}`);
  }
}

export default DeviceService;
