import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  Thermometer,
  Droplets,
  AlertCircle,
  RefreshCw,
  MapPin,
  Activity,
  Wrench,
  ArrowLeft,
  Zap,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import DeviceService, { Device, Telemetry, MaintenanceLog, DailyMetrics, ActivityLog, MaintenanceSchedule } from '@/services/deviceService';
import { ROUTE } from '@/constants';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const createSensorIcon = () => {
  const html = renderToStaticMarkup(
    <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 shadow-lg bg-blue-500 border-white">
      <Activity className="w-5 h-5 text-white" />
    </div>
  );
  return L.divIcon({
    html,
    className: 'custom-sensor-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  telemetry_received: 'Telemetry Received',
  command_sent: 'Command Sent',
  paired: 'Device Paired',
  calibration_recorded: 'Calibration Recorded',
  anomaly_detected: 'Anomaly Detected',
  status_changed: 'Status Changed',
  location_updated: 'Location Updated',
  maintenance_due: 'Maintenance Due',
  offline_marked: 'Marked Offline',
};

export const AdminDeviceDetail = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveReadLoading, setLiveReadLoading] = useState(false);

  // Calibrate dialog
  const [calibrateDialogOpen, setCalibrateDialogOpen] = useState(false);
  const [calibrateNotes, setCalibrateNotes] = useState('');
  const [calibrateLoading, setCalibrateLoading] = useState(false);

  // Maintenance schedule edit dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(30);
  const [scheduleReminder, setScheduleReminder] = useState(14);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Telemetry pagination
  const [telemetryHistory, setTelemetryHistory] = useState<Telemetry[]>([]);
  const [telemetryPage, setTelemetryPage] = useState(1);
  const [telemetryLastPage, setTelemetryLastPage] = useState(1);

  // Activity logs pagination
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLastPage, setActivityLastPage] = useState(1);

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);

  useEffect(() => {
    if (token && deviceId) {
      fetchDevice();
    }
  }, [token, deviceId]);

  const fetchDevice = async () => {
    try {
      setLoading(true);
      setError(null);
      const deviceService = new DeviceService(token!);
      const d = await deviceService.getDevice(Number(deviceId));
      setDevice(d);

      if (d.maintenance_schedule) {
        setScheduleInterval(d.maintenance_schedule.calibration_interval_days);
        setScheduleReminder(d.maintenance_schedule.reminder_days_before);
      }

      await Promise.all([
        fetchTelemetry(1),
        fetchActivityLogs(1),
        deviceService.getMaintenance(Number(deviceId)).then(m => setMaintenanceLogs(m.logs)),
        deviceService.getDailyMetrics(Number(deviceId)).then(setDailyMetrics),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch device');
    } finally {
      setLoading(false);
    }
  };

  const fetchTelemetry = async (page: number) => {
    const deviceService = new DeviceService(token!);
    const history = await deviceService.getTelemetryHistory(Number(deviceId), page, 20);
    setTelemetryHistory(history.data);
    setTelemetryPage(history.current_page);
    setTelemetryLastPage(history.last_page);
  };

  const fetchActivityLogs = async (page: number) => {
    const deviceService = new DeviceService(token!);
    const logs = await deviceService.getActivityLogs(Number(deviceId), page, 20);
    setActivityLogs(logs.data);
    setActivityPage(logs.current_page);
    setActivityLastPage(logs.last_page);
  };

  const handleLiveRead = async () => {
    if (!device) return;
    try {
      setLiveReadLoading(true);
      const deviceService = new DeviceService(token!);
      await deviceService.requestLiveRead(device.id);
      setTimeout(() => fetchDevice(), 3000);
    } catch (err) {
      console.error('Live read failed:', err);
    } finally {
      setLiveReadLoading(false);
    }
  };

  const handleCalibrate = async () => {
    if (!device) return;
    try {
      setCalibrateLoading(true);
      const deviceService = new DeviceService(token!);
      await deviceService.calibrate(device.id, calibrateNotes.trim() || undefined);
      setCalibrateDialogOpen(false);
      setCalibrateNotes('');
      fetchDevice();
    } catch (err) {
      console.error('Calibration failed:', err);
    } finally {
      setCalibrateLoading(false);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!device) return;
    try {
      setScheduleLoading(true);
      const deviceService = new DeviceService(token!);
      await deviceService.updateMaintenanceSchedule(device.id, scheduleInterval, scheduleReminder);
      setScheduleDialogOpen(false);
      fetchDevice();
    } catch (err) {
      console.error('Schedule update failed:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paired' || status === 'online') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircle2 className="w-3 h-3" />
          {status}
        </div>
      );
    }
    if (status === 'offline') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <AlertCircle className="w-3 h-3" />
          Offline
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
        <Clock className="w-3 h-3" />
        Awaiting Pair
      </div>
    );
  };

  const getCalibrationColor = (nextDueAt: string | null | undefined) => {
    if (!nextDueAt) return 'text-gray-500';
    const due = new Date(nextDueAt);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'text-red-600';
    if (diffDays <= 14) return 'text-yellow-600';
    return 'text-green-600';
  };

  const chartData = dailyMetrics
    .slice()
    .reverse()
    .map((m) => ({
      date: m.date,
      pH: m.avg_ph,
      TDS: m.avg_tds_mg_l,
      Turbidity: m.avg_turbidity_ntu,
      Temperature: m.avg_temp_celsius,
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-waterbase-50">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <RefreshCw className="w-8 h-8 animate-spin text-waterbase-500" />
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="min-h-screen bg-waterbase-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error || 'Device not found'}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button variant="outline" className="mb-4 gap-2" onClick={() => navigate(ROUTE.ADMIN_DEVICES.path)}>
          <ArrowLeft className="w-4 h-4" />
          Back to Devices
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-waterbase-950">{device.name || device.station_id || 'Unnamed Device'}</h1>
            {getStatusBadge(device.status)}
          </div>
          <p className="text-waterbase-600 mt-1">Station ID: {device.station_id || 'N/A'} &middot; MAC: {device.mac_address}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          {device.latitude && device.longitude ? (
            <Card className="lg:col-span-2 border-waterbase-200">
              <CardContent className="p-0">
                <div className="h-64 w-full rounded-lg overflow-hidden">
                  <MapContainer
                    center={[device.latitude, device.longitude]}
                    zoom={13}
                    className="w-full h-full z-[1]"
                  >
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[device.latitude, device.longitude]} icon={createSensorIcon()}>
                      <Popup>{device.name || device.station_id}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="lg:col-span-2 border-waterbase-200">
              <CardContent className="pt-12 pb-12 text-center text-waterbase-500">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-waterbase-300" />
                <p>No location set for this device</p>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleLiveRead} disabled={liveReadLoading} className="w-full gap-2">
                <Zap className={`w-4 h-4 ${liveReadLoading ? 'animate-pulse' : ''}`} />
                {liveReadLoading ? 'Requesting...' : 'Request Live Reading'}
              </Button>
              <Button variant="outline" onClick={() => setCalibrateDialogOpen(true)} className="w-full gap-2">
                <Wrench className="w-4 h-4" />
                Record Calibration
              </Button>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(true)} className="w-full gap-2">
                <Clock className="w-4 h-4" />
                Edit Schedule
              </Button>
              <Button variant="outline" onClick={fetchDevice} className="w-full gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Telemetry cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="border-waterbase-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-waterbase-600 mb-1">
                <Thermometer className="w-4 h-4 text-orange-500" />
                Temperature
              </div>
              <div className="text-2xl font-bold text-waterbase-950">
                {device.latest_telemetry?.temperature_celsius !== null && device.latest_telemetry?.temperature_celsius !== undefined
                  ? `${Number(device.latest_telemetry.temperature_celsius).toFixed(1)}°C`
                  : '--'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-waterbase-600 mb-1">
                <Droplets className="w-4 h-4 text-blue-500" />
                pH
              </div>
              <div className="text-2xl font-bold text-waterbase-950">
                {device.latest_telemetry?.ph !== null && device.latest_telemetry?.ph !== undefined
                  ? Number(device.latest_telemetry.ph).toFixed(2)
                  : '--'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-waterbase-600 mb-1">
                <Activity className="w-4 h-4 text-purple-500" />
                Turbidity
              </div>
              <div className="text-2xl font-bold text-waterbase-950">
                {device.latest_telemetry?.turbidity_ntu !== null && device.latest_telemetry?.turbidity_ntu !== undefined
                  ? `${Number(device.latest_telemetry.turbidity_ntu).toFixed(1)} NTU`
                  : '--'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-waterbase-600 mb-1">
                <Zap className="w-4 h-4 text-green-500" />
                TDS
              </div>
              <div className="text-2xl font-bold text-waterbase-950">
                {device.latest_telemetry?.tds_mg_l !== null && device.latest_telemetry?.tds_mg_l !== undefined
                  ? `${Number(device.latest_telemetry.tds_mg_l).toFixed(0)} mg/L`
                  : '--'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="telemetry" className="mt-6">
          <TabsList>
            <TabsTrigger value="telemetry">Telemetry History</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="telemetry">
            <Card className="border-waterbase-200">
              <CardHeader>
                <CardTitle>Recent Telemetry</CardTitle>
                <CardDescription>
                  Page {telemetryPage} of {telemetryLastPage} &middot; {telemetryHistory.length} records shown
                </CardDescription>
              </CardHeader>
              <CardContent>
                {telemetryHistory.length === 0 ? (
                  <p className="text-waterbase-500">No telemetry recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-waterbase-200">
                          <th className="text-left py-2 px-3">Recorded</th>
                          <th className="text-left py-2 px-3">Received</th>
                          <th className="text-left py-2 px-3">Latency</th>
                          <th className="text-left py-2 px-3">Temp</th>
                          <th className="text-left py-2 px-3">pH</th>
                          <th className="text-left py-2 px-3">Turbidity</th>
                          <th className="text-left py-2 px-3">TDS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {telemetryHistory.map((t) => (
                          <tr key={t.id} className="border-b border-waterbase-100">
                            <td className="py-2 px-3 whitespace-nowrap">{new Date(t.recorded_at).toLocaleString()}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{t.received_at ? new Date(t.received_at).toLocaleString() : '--'}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {t.latency_ms !== null ? `${t.latency_ms} ms` : '--'}
                            </td>
                            <td className="py-2 px-3">{t.temperature_celsius != null && !isNaN(Number(t.temperature_celsius)) ? Number(t.temperature_celsius).toFixed(1) : '--'}</td>
                            <td className="py-2 px-3">{t.ph != null && !isNaN(Number(t.ph)) ? Number(t.ph).toFixed(2) : '--'}</td>
                            <td className="py-2 px-3">{t.turbidity_ntu != null && !isNaN(Number(t.turbidity_ntu)) ? Number(t.turbidity_ntu).toFixed(1) : '--'}</td>
                            <td className="py-2 px-3">{t.tds_mg_l != null && !isNaN(Number(t.tds_mg_l)) ? Number(t.tds_mg_l).toFixed(0) : '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {telemetryLastPage > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => fetchTelemetry(telemetryPage - 1)} disabled={telemetryPage <= 1}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-waterbase-600">{telemetryPage} / {telemetryLastPage}</span>
                        <Button variant="outline" size="sm" onClick={() => fetchTelemetry(telemetryPage + 1)} disabled={telemetryPage >= telemetryLastPage}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card className="border-waterbase-200">
              <CardHeader>
                <CardTitle>Maintenance Schedule</CardTitle>
                <CardDescription>
                  Next calibration due:{" "}
                  <span className={`font-semibold ${getCalibrationColor(device.maintenance_schedule?.next_due_at)}`}>
                    {device.maintenance_schedule?.next_due_at
                      ? new Date(device.maintenance_schedule.next_due_at).toLocaleDateString()
                      : 'Not scheduled'}
                  </span>
                  <span className="text-waterbase-500 ml-2">
                    (Interval: {device.maintenance_schedule?.calibration_interval_days ?? 30} days, Reminder: {device.maintenance_schedule?.reminder_days_before ?? 14} days before)
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-3">Maintenance History</h4>
                {maintenanceLogs.length === 0 ? (
                  <p className="text-waterbase-500">No maintenance records yet.</p>
                ) : (
                  <div className="space-y-3">
                    {maintenanceLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-waterbase-50">
                        <Wrench className="w-4 h-4 text-waterbase-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium capitalize">{log.maintenance_type}</div>
                          <div className="text-xs text-waterbase-500">{new Date(log.performed_at).toLocaleString()}</div>
                          {log.notes && <div className="text-xs text-waterbase-600 mt-1">{log.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <Card className="border-waterbase-200">
              <CardHeader>
                <CardTitle>Daily Aggregates</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="text-waterbase-500">No aggregated data available.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="pH" stroke="#3b82f6" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="TDS" stroke="#10b981" dot={false} />
                          <Line type="monotone" dataKey="Turbidity" stroke="#8b5cf6" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="border-waterbase-200">
              <CardHeader>
                <CardTitle>Device Activity Log</CardTitle>
                <CardDescription>
                  Page {activityPage} of {activityLastPage}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <p className="text-waterbase-500">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-waterbase-50">
                        <FileText className="w-4 h-4 text-waterbase-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{EVENT_TYPE_LABELS[log.event_type] || log.event_type}</span>
                            <span className="text-xs text-waterbase-400">{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          {log.description && <div className="text-xs text-waterbase-600 mt-1">{log.description}</div>}
                          {log.user && (
                            <div className="text-xs text-waterbase-500 mt-1">
                              By: {log.user.firstName} {log.user.lastName}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {activityLastPage > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => fetchActivityLogs(activityPage - 1)} disabled={activityPage <= 1}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-waterbase-600">{activityPage} / {activityLastPage}</span>
                        <Button variant="outline" size="sm" onClick={() => fetchActivityLogs(activityPage + 1)} disabled={activityPage >= activityLastPage}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Calibrate Dialog */}
        <Dialog open={calibrateDialogOpen} onOpenChange={setCalibrateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Record Calibration</DialogTitle>
              <DialogDescription>Log a calibration event for this device.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={calibrateNotes}
                  onChange={(e) => setCalibrateNotes(e.target.value)}
                  placeholder="e.g., Replaced pH probe"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCalibrateDialogOpen(false)} disabled={calibrateLoading}>
                Cancel
              </Button>
              <Button onClick={handleCalibrate} disabled={calibrateLoading}>
                {calibrateLoading ? 'Saving...' : 'Record Calibration'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Edit Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Maintenance Schedule</DialogTitle>
              <DialogDescription>Set how often this device should be calibrated and when to send reminders.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Calibration Interval</Label>
                <Select
                  value={String(scheduleInterval)}
                  onValueChange={(v) => setScheduleInterval(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days (Weekly)</SelectItem>
                    <SelectItem value="14">14 days (Bi-weekly)</SelectItem>
                    <SelectItem value="30">30 days (Monthly)</SelectItem>
                    <SelectItem value="60">60 days (Bi-monthly)</SelectItem>
                    <SelectItem value="90">90 days (Quarterly)</SelectItem>
                    <SelectItem value="180">180 days (Semi-annually)</SelectItem>
                    <SelectItem value="365">365 days (Annually)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-waterbase-500">How often should this device be calibrated?</p>
              </div>
              <div className="grid gap-2">
                <Label>Reminder Lead Time</Label>
                <Select
                  value={String(scheduleReminder)}
                  onValueChange={(v) => setScheduleReminder(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reminder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="7">1 week before</SelectItem>
                    <SelectItem value="14">2 weeks before</SelectItem>
                    <SelectItem value="30">1 month before</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-waterbase-500">When should we notify you before the due date?</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} disabled={scheduleLoading}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSchedule} disabled={scheduleLoading}>
                {scheduleLoading ? 'Saving...' : 'Update Schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDeviceDetail;
