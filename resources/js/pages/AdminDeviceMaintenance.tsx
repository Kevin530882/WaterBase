import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowRight,
  Settings,
} from 'lucide-react';
import DeviceService, { Device, MaintenanceSchedule } from '@/services/deviceService';
import { ROUTE } from '@/constants';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';

const createStatusIcon = (color: string) => {
  const html = renderToStaticMarkup(
    <div
      className="w-6 h-6 flex items-center justify-center rounded-full border-2 shadow-lg border-white"
      style={{ backgroundColor: color }}
    />
  );
  return L.divIcon({
    html,
    className: 'custom-status-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const getHealthColor = (device: Device): string => {
  if (device.status === 'offline') return '#ef4444';
  const nextDue = device.maintenance_schedule?.next_due_at;
  if (nextDue) {
    const diffDays = Math.ceil((new Date(nextDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '#ef4444';
    if (diffDays <= 14) return '#eab308';
  }
  if (device.anomaly_flags && device.anomaly_flags.length > 0) return '#eab308';
  return '#22c55e';
};

const getHealthLabel = (device: Device): string => {
  if (device.status === 'offline') return 'Offline';
  const nextDue = device.maintenance_schedule?.next_due_at;
  if (nextDue) {
    const diffDays = Math.ceil((new Date(nextDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays <= 14) return 'Due Soon';
  }
  if (device.anomaly_flags && device.anomaly_flags.length > 0) return 'Anomaly';
  return 'Healthy';
};

const INTERVAL_OPTIONS = [
  { value: '7', label: '7 days (Weekly)' },
  { value: '14', label: '14 days (Bi-weekly)' },
  { value: '30', label: '30 days (Monthly)' },
  { value: '60', label: '60 days (Bi-monthly)' },
  { value: '90', label: '90 days (Quarterly)' },
  { value: '180', label: '180 days (Semi-annually)' },
  { value: '365', label: '365 days (Annually)' },
];

const REMINDER_OPTIONS = [
  { value: '1', label: '1 day before' },
  { value: '3', label: '3 days before' },
  { value: '7', label: '1 week before' },
  { value: '14', label: '2 weeks before' },
  { value: '30', label: '1 month before' },
];

export const AdminDeviceMaintenance = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [overdueDevices, setOverdueDevices] = useState<Device[]>([]);
  const [upcomingDevices, setUpcomingDevices] = useState<Device[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline schedule editing state
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editInterval, setEditInterval] = useState(30);
  const [editReminder, setEditReminder] = useState(14);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const deviceService = new DeviceService(token!);

      const [overdue, upcoming, all] = await Promise.all([
        deviceService.getOverdueDevices(),
        deviceService.getUpcomingDevices(14),
        deviceService.listDevices(1, 100),
      ]);

      setOverdueDevices(overdue.devices);
      setUpcomingDevices(upcoming.devices);
      setAllDevices(all.data.filter((d) => d.status !== 'awaiting_pair'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch maintenance data');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (device: Device) => {
    setEditingDevice(device);
    setEditInterval(device.maintenance_schedule?.calibration_interval_days ?? 30);
    setEditReminder(device.maintenance_schedule?.reminder_days_before ?? 14);
  };

  const handleSaveSchedule = async () => {
    if (!editingDevice || !token) return;
    try {
      setEditLoading(true);
      const deviceService = new DeviceService(token);
      await deviceService.updateMaintenanceSchedule(editingDevice.id, editInterval, editReminder);
      setEditingDevice(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
    } finally {
      setEditLoading(false);
    }
  };

  const renderAlertList = (devices: Device[], type: 'time' | 'anomaly') => (
    <div className="space-y-3">
      {devices.length === 0 ? (
        <p className="text-sm text-waterbase-500">No {type === 'time' ? 'time-based' : 'anomaly-based'} alerts.</p>
      ) : (
        devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white border border-waterbase-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(ROUTE.ADMIN_DEVICE_DETAIL.path.replace(':deviceId', String(device.id)))}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: getHealthColor(device) }}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{device.name || device.station_id}</div>
                <div className="text-xs text-waterbase-500">
                  {type === 'time' && device.maintenance_schedule?.next_due_at
                    ? `Due: ${new Date(device.maintenance_schedule.next_due_at).toLocaleDateString()}`
                    : device.anomaly_flags && device.anomaly_flags.length > 0
                      ? `Anomaly: ${device.anomaly_flags[device.anomaly_flags.length - 1].reasons.join(', ')}`
                      : 'Issue detected'}
                </div>
                <div className="text-xs text-waterbase-400 mt-0.5">
                  Interval: {device.maintenance_schedule?.calibration_interval_days ?? 30}d · Reminder: {device.maintenance_schedule?.reminder_days_before ?? 14}d before
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-waterbase-600"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(device);
                }}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <ArrowRight className="w-4 h-4 text-waterbase-400" />
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-waterbase-950">Device Maintenance</h1>
            <p className="text-waterbase-600">Monitor calibration deadlines and anomalies</p>
          </div>
          <Button onClick={fetchData} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <Card className="lg:col-span-2 border-waterbase-200">
            <CardHeader>
              <CardTitle>Maintenance Status Map</CardTitle>
              <CardDescription>
                Green = Healthy &middot; Yellow = Due Soon/Anomaly &middot; Red = Overdue/Offline
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full rounded-lg overflow-hidden">
                <MapContainer center={[14.5995, 120.9842]} zoom={10} className="w-full h-full z-[1]">
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {allDevices
                    .filter((d) => d.latitude && d.longitude)
                    .map((device) => (
                      <Marker
                        key={device.id}
                        position={[device.latitude!, device.longitude!]}
                        icon={createStatusIcon(getHealthColor(device))}
                        eventHandlers={{
                          click: () => navigate(ROUTE.ADMIN_DEVICE_DETAIL.path.replace(':deviceId', String(device.id))),
                        }}
                      >
                        <Popup>
                          <div className="text-sm font-medium">{device.name || device.station_id}</div>
                          <div className="text-xs text-gray-500">{getHealthLabel(device)}</div>
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          {/* Time-based alerts */}
          <Card className="border-waterbase-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-waterbase-600" />
                <CardTitle>Calibration Alerts</CardTitle>
              </div>
              <CardDescription>Devices approaching or past calibration deadline</CardDescription>
            </CardHeader>
            <CardContent>
              {renderAlertList([...overdueDevices, ...upcomingDevices], 'time')}
            </CardContent>
          </Card>

          {/* Anomaly-based alerts */}
          <Card className="border-waterbase-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-waterbase-600" />
                <CardTitle>Anomaly Alerts</CardTitle>
              </div>
              <CardDescription>Devices with flatlined or out-of-range readings</CardDescription>
            </CardHeader>
            <CardContent>
              {renderAlertList(
                allDevices.filter(
                  (d) => d.anomaly_flags && d.anomaly_flags.length > 0 && !overdueDevices.some((o) => o.id === d.id)
                ),
                'anomaly'
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inline Schedule Edit Dialog */}
        <Dialog open={!!editingDevice} onOpenChange={(open) => !open && setEditingDevice(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Schedule — {editingDevice?.name || editingDevice?.station_id}</DialogTitle>
              <DialogDescription>Set how often this device should be calibrated and when to send reminders.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Calibration Interval</Label>
                <Select value={String(editInterval)} onValueChange={(v) => setEditInterval(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reminder Lead Time</Label>
                <Select value={String(editReminder)} onValueChange={(v) => setEditReminder(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reminder" />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDevice(null)} disabled={editLoading}>Cancel</Button>
              <Button onClick={handleSaveSchedule} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Schedule'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDeviceMaintenance;
