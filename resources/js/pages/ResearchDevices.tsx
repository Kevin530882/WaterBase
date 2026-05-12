import { useEffect, useState } from 'react';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import DeviceService, { Device } from '@/services/deviceService';
import { ROUTE } from '@/constants';

export const ResearchDevices = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const loadDevices = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const service = new DeviceService(token);
      const response = await service.listDevices(1, 100);
      setDevices(response.data.filter((device) => device.status !== 'awaiting_pair'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [token]);

  const filteredDevices = devices.filter((device) => {
    const search = q.trim().toLowerCase();
    if (!search) return true;
    return [
      device.station_id,
      device.name,
      device.mac_address,
      device.status,
    ].some((value) => String(value || '').toLowerCase().includes(search));
  });

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-waterbase-950 mb-2">Research Devices</h1>
            <p className="text-waterbase-600">Read-only sensor inventory for water quality research.</p>
          </div>
          <Button variant="outline" onClick={loadDevices} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="relative mb-6 max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-waterbase-400" />
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search station, device name, MAC, or status" className="pl-9" />
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-700">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <div className="py-12 text-center text-waterbase-600">Loading devices...</div>
        ) : filteredDevices.length === 0 ? (
          <Card className="border-waterbase-200">
            <CardContent className="py-12 text-center text-waterbase-600">No devices found.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="border-waterbase-200">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <div className="text-lg font-semibold text-waterbase-950">{device.name || device.station_id || 'Unnamed Device'}</div>
                    <div className="text-sm text-waterbase-600">Station ID: {device.station_id || 'N/A'}</div>
                    <div className="text-xs text-waterbase-500 mt-1">{device.mac_address}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-waterbase-500">Status</div>
                      <div className="font-medium capitalize">{device.status}</div>
                    </div>
                    <div>
                      <div className="text-waterbase-500">Readings</div>
                      <div className="font-medium">{device.telemetry_count}</div>
                    </div>
                    <div>
                      <div className="text-waterbase-500">pH</div>
                      <div className="font-medium">{device.latest_telemetry?.ph ?? 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-waterbase-500">Turbidity</div>
                      <div className="font-medium">{device.latest_telemetry?.turbidity_ntu ?? 'N/A'}</div>
                    </div>
                  </div>
                  <Button className="w-full gap-2" onClick={() => navigate(ROUTE.RESEARCH_DEVICE_DETAIL.path.replace(':deviceId', String(device.id)))}>
                    <Eye className="w-4 h-4" />
                    View Device
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchDevices;
