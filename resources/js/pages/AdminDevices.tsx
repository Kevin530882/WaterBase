import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import {
  Card,
  CardContent,
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
import {
  Wifi,
  CheckCircle2,
  Clock,
  Thermometer,
  Droplets,
  AlertCircle,
  RefreshCw,
  Link,
  Trash2,
  MapPin,
  Wrench,
} from 'lucide-react';
import DeviceService, { Device } from '@/services/deviceService';
import { ROUTE } from '@/constants';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';

interface LocalDevice extends Device {
  pairedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
}

const createSensorIcon = () => {
  const html = renderToStaticMarkup(
    <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 shadow-lg bg-blue-500 border-white">
      <Wifi className="w-5 h-5 text-white" />
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

function LocationPicker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const AdminDevices = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<LocalDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'paired' | 'discovered'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Pairing dialog state
  const [pairingDevice, setPairingDevice] = useState<LocalDevice | null>(null);
  const [pairingStationId, setPairingStationId] = useState('');
  const [pairingName, setPairingName] = useState('');
  const [pairingLat, setPairingLat] = useState<number>(14.5995);
  const [pairingLng, setPairingLng] = useState<number>(120.9842);
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);

  // Delete dialog state
  const [deleteDevice, setDeleteDevice] = useState<LocalDevice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDevices();
    }
  }, [token, filter, page]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);

      const deviceService = new DeviceService(token!);
      let response;

      if (filter === 'discovered') {
        response = await deviceService.listDiscoveredDevices(page, 20);
      } else {
        const status = filter === 'paired' ? 'paired' : undefined;
        response = await deviceService.listDevices(page, 20, status);
      }

      setDevices(response.data);
      setTotalPages(response.last_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  };

  const handlePairDevice = async () => {
    if (!pairingDevice || !pairingStationId.trim()) {
      return;
    }

    try {
      setPairingLoading(true);
      const deviceService = new DeviceService(token!);
      await deviceService.pairDevice(
        pairingDevice.id,
        pairingStationId.trim(),
        pairingName.trim() || undefined,
        pairingLat,
        pairingLng
      );

      await fetchDevices();

      setPairingDialogOpen(false);
      setPairingDevice(null);
      setPairingStationId('');
      setPairingName('');
    } catch (err) {
      console.error('Error pairing device:', err);
    } finally {
      setPairingLoading(false);
    }
  };

  const openPairingDialog = (device: LocalDevice) => {
    setPairingDevice(device);
    setPairingStationId('');
    setPairingName(device.name || '');
    setPairingLat(14.5995);
    setPairingLng(120.9842);
    setPairingDialogOpen(true);
  };

  const handleDeleteDevice = async () => {
    if (!deleteDevice) {
      return;
    }

    try {
      setDeleteLoading(true);
      const deviceService = new DeviceService(token!);
      await deviceService.deleteDevice(deleteDevice.id);

      await fetchDevices();

      setDeleteDialogOpen(false);
      setDeleteDevice(null);
    } catch (err) {
      console.error('Error deleting device:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteDialog = (device: LocalDevice) => {
    setDeleteDevice(device);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (device: LocalDevice) => {
    if (device.status === 'paired' || device.status === 'online') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircle2 className="w-3 h-3" />
          Paired
        </div>
      );
    }
    if (device.status === 'offline') {
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

  const getLastSeenTime = (device: LocalDevice) => {
    if (device.last_seen_at) {
      return new Date(device.last_seen_at).toLocaleString();
    }
    if (device.discovery_last_seen_at) {
      return new Date(device.discovery_last_seen_at).toLocaleString();
    }
    return 'Never';
  };

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-waterbase-950 mb-2">IoT Devices</h1>
          <p className="text-waterbase-600">
            Manage discovered and paired water quality monitoring devices
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
              className="text-sm"
            >
              All Devices
            </Button>
            <Button
              variant={filter === 'discovered' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('discovered');
                setPage(1);
              }}
              className="text-sm"
            >
              Discovered
            </Button>
            <Button
              variant={filter === 'paired' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('paired');
                setPage(1);
              }}
              className="text-sm"
            >
              Paired
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTE.ADMIN_DEVICE_MAINTENANCE.path)} className="gap-2">
              <Wrench className="w-4 h-4" />
              Maintenance Hub
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Devices List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <RefreshCw className="w-8 h-8 animate-spin text-waterbase-500 mb-2" />
            </div>
            <p className="text-waterbase-600">Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <Card className="border-waterbase-200">
            <CardContent className="pt-12 pb-12 text-center">
              <Wifi className="w-12 h-12 text-waterbase-300 mx-auto mb-4" />
              <p className="text-waterbase-600">No devices found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <Card key={device.id} className="border-waterbase-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Device Info */}
                    <div>
                      <div className="text-sm font-medium text-waterbase-600 mb-1">
                        Device ID
                      </div>
                      <div className="text-lg font-semibold text-waterbase-950">
                        {device.station_id || device.mac_address}
                      </div>
                      {device.name && (
                        <div className="text-xs text-waterbase-600 mt-1">{device.name}</div>
                      )}
                      {device.latitude && device.longitude && (
                        <div className="text-xs text-waterbase-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {device.latitude.toFixed(5)}, {device.longitude.toFixed(5)}
                        </div>
                      )}
                    </div>

                     {/* Status */}
                     <div>
                       <div className="text-sm font-medium text-waterbase-600 mb-1">Status</div>
                       {getStatusBadge(device)}
                       <div className="text-xs text-waterbase-500 mt-2">
                         <span className="font-mono">{device.mac_address}</span>
                       </div>
                       <div className="flex gap-2 mt-2 flex-wrap">
                         {device.status === 'awaiting_pair' && (
                           <Button
                             onClick={() => openPairingDialog(device)}
                             size="sm"
                             className="gap-1"
                           >
                             <Link className="w-3 h-3" />
                             Pair Device
                           </Button>
                         )}
                         {device.status !== 'awaiting_pair' && (
                           <Button
                             size="sm"
                             variant="outline"
                             className="gap-1"
                             onClick={() => navigate(ROUTE.ADMIN_DEVICE_DETAIL.path.replace(':deviceId', String(device.id)))}
                           >
                             View
                           </Button>
                         )}
                         <Button
                           onClick={() => openDeleteDialog(device)}
                           size="sm"
                           variant="destructive"
                           className="gap-1"
                         >
                           <Trash2 className="w-3 h-3" />
                           Delete
                         </Button>
                       </div>
                     </div>

                    {/* Latest Telemetry */}
                    <div>
                      <div className="text-sm font-medium text-waterbase-600 mb-2">
                        Latest Reading
                      </div>
                      {device.latest_telemetry ? (
                        <div className="space-y-1 text-xs">
                          {device.latest_telemetry.temperature_celsius !== null && (
                            <div className="flex items-center gap-1">
                              <Thermometer className="w-3 h-3 text-orange-500" />
                              <span>{Number(device.latest_telemetry.temperature_celsius).toFixed(1)}°C</span>
                            </div>
                          )}
                          {device.latest_telemetry.ph !== null && (
                            <div className="flex items-center gap-1">
                              <Droplets className="w-3 h-3 text-blue-500" />
                              <span>pH {Number(device.latest_telemetry.ph).toFixed(2)}</span>
                            </div>
                          )}
                          {device.latest_telemetry.turbidity_ntu !== null && (
                            <div className="flex items-center gap-1">
                              <Wifi className="w-3 h-3 text-purple-500" />
                              <span>{Number(device.latest_telemetry.turbidity_ntu).toFixed(1)} NTU</span>
                            </div>
                          )}
                          {device.latest_telemetry.tds_mg_l !== null && (
                            <div className="flex items-center gap-1">
                              <Droplets className="w-3 h-3 text-green-500" />
                              <span>{Number(device.latest_telemetry.tds_mg_l).toFixed(0)} mg/L</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-waterbase-500">No readings yet</div>
                      )}
                    </div>

                    {/* Last Seen */}
                    <div>
                      <div className="text-sm font-medium text-waterbase-600 mb-1">
                        Last Seen
                      </div>
                      <div className="text-xs text-waterbase-700">
                        {getLastSeenTime(device)}
                      </div>
                      <div className="text-xs text-waterbase-500 mt-2">
                        {device.telemetry_count} readings
                      </div>
                    </div>
                  </div>

                  {/* Paired By */}
                  {device.paired_by_user && (
                    <div className="mt-4 pt-4 border-t border-waterbase-200 text-xs text-waterbase-600">
                      Paired by: {device.paired_by_user.firstName} {device.paired_by_user.lastName}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm text-waterbase-600">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}

        {/* Pairing Dialog */}
        <Dialog open={pairingDialogOpen} onOpenChange={setPairingDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Pair IoT Device</DialogTitle>
              <DialogDescription>
                Assign a station ID, name, and location to this water quality monitoring device.
                Click on the map to set the sensor location.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="station-id">Station ID *</Label>
                <Input
                  id="station-id"
                  value={pairingStationId}
                  onChange={(e) => setPairingStationId(e.target.value)}
                  placeholder="e.g., STATION-001"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-name">Device Name (Optional)</Label>
                <Input
                  id="device-name"
                  value={pairingName}
                  onChange={(e) => setPairingName(e.target.value)}
                  placeholder="e.g., River Monitoring Station Alpha"
                />
              </div>
              <div className="grid gap-2">
                <Label>Sensor Location</Label>
                <div className="h-48 w-full rounded-lg overflow-hidden border border-waterbase-200">
                  <MapContainer
                    center={[pairingLat, pairingLng]}
                    zoom={12}
                    className="w-full h-full"
                  >
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker onLocationSelect={(lat, lng) => {
                      setPairingLat(lat);
                      setPairingLng(lng);
                    }} />
                    <Marker position={[pairingLat, pairingLng]} icon={createSensorIcon()}>
                      <Popup>Sensor location</Popup>
                    </Marker>
                  </MapContainer>
                </div>
                <p className="text-xs text-waterbase-500">
                  Lat: {pairingLat.toFixed(5)}, Lng: {pairingLng.toFixed(5)}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPairingDialogOpen(false)}
                disabled={pairingLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePairDevice}
                disabled={!pairingStationId.trim() || pairingLoading}
              >
                {pairingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Pairing...
                  </>
                ) : (
                  'Pair Device'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Device</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this device? This action cannot be undone.
                The device will be removed from the system and will need to be rediscovered if reconnected.
              </DialogDescription>
            </DialogHeader>
            {deleteDevice && (
              <div className="py-4">
                <p className="text-sm">
                  <strong>Device:</strong> {deleteDevice.station_id || deleteDevice.mac_address}
                </p>
                <p className="text-sm">
                  <strong>Status:</strong> {deleteDevice.status}
                </p>
                <p className="text-sm">
                  <strong>Telemetry Count:</strong> {deleteDevice.telemetry_count}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteDevice}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Device'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
