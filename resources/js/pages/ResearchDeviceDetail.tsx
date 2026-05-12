import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowLeft, Droplets, MapPin, RefreshCw, Thermometer, Zap } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import DeviceService, { Device, TelemetryFilters } from '@/services/deviceService';
import { TelemetryTable } from '@/components/pagecomponents/TelemetryTable';
import { ROUTE } from '@/constants';

export const ResearchDeviceDetail = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevice = async () => {
    if (!token || !deviceId) return;

    try {
      setLoading(true);
      setError(null);
      const service = new DeviceService(token);
      setDevice(await service.getDevice(Number(deviceId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevice();
  }, [token, deviceId]);

  const fetchTelemetry = useCallback((page: number, perPage: number, filters: TelemetryFilters) => {
    const service = new DeviceService(token!);
    return service.getTelemetryHistory(Number(deviceId), page, perPage, filters);
  }, [deviceId, token]);

  const metricCards = [
    {
      label: 'Temperature',
      icon: Thermometer,
      value: device?.latest_telemetry?.temperature_celsius !== null && device?.latest_telemetry?.temperature_celsius !== undefined
        ? `${Number(device.latest_telemetry.temperature_celsius).toFixed(1)} C`
        : '--',
      color: 'text-orange-500',
    },
    {
      label: 'pH',
      icon: Droplets,
      value: device?.latest_telemetry?.ph !== null && device?.latest_telemetry?.ph !== undefined
        ? Number(device.latest_telemetry.ph).toFixed(2)
        : '--',
      color: 'text-blue-500',
    },
    {
      label: 'Turbidity',
      icon: Activity,
      value: device?.latest_telemetry?.turbidity_ntu !== null && device?.latest_telemetry?.turbidity_ntu !== undefined
        ? `${Number(device.latest_telemetry.turbidity_ntu).toFixed(1)} NTU`
        : '--',
      color: 'text-purple-500',
    },
    {
      label: 'TDS',
      icon: Zap,
      value: device?.latest_telemetry?.tds_mg_l !== null && device?.latest_telemetry?.tds_mg_l !== undefined
        ? `${Number(device.latest_telemetry.tds_mg_l).toFixed(0)} mg/L`
        : '--',
      color: 'text-green-500',
    },
  ];

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button variant="outline" className="mb-4 gap-2" onClick={() => navigate(ROUTE.RESEARCH_DEVICES.path)}>
          <ArrowLeft className="w-4 h-4" />
          Back to Research Devices
        </Button>

        {loading ? (
          <div className="py-12 text-center text-waterbase-600">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-waterbase-500" />
            Loading device...
          </div>
        ) : error || !device ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-700">{error || 'Device not found'}</CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-waterbase-950">{device.name || device.station_id || 'Unnamed Device'}</h1>
              <p className="text-waterbase-600 mt-1">Station ID: {device.station_id || 'N/A'} &middot; MAC: {device.mac_address}</p>
              {device.latitude && device.longitude && (
                <p className="text-sm text-waterbase-500 mt-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {device.latitude.toFixed(5)}, {device.longitude.toFixed(5)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {metricCards.map((metric) => {
                const Icon = metric.icon;
                return (
                  <Card key={metric.label} className="border-waterbase-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-sm text-waterbase-600 mb-1">
                        <Icon className={`w-4 h-4 ${metric.color}`} />
                        {metric.label}
                      </div>
                      <div className="text-2xl font-bold text-waterbase-950">{metric.value}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <TelemetryTable
              title="Telemetry History"
              description="Read-only sensor readings for research analysis."
              downloadFilename={`research-telemetry-device-${device.id}.csv`}
              fetchRows={fetchTelemetry}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ResearchDeviceDetail;
