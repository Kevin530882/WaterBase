import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import DeviceService, { TelemetryFilters } from '@/services/deviceService';
import { TelemetryTable } from '@/components/pagecomponents/TelemetryTable';
import { ROUTE } from '@/constants';

export const AdminTelemetry = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchTelemetry = useCallback((page: number, perPage: number, filters: TelemetryFilters) => {
    const service = new DeviceService(token!);
    return service.listTelemetry(page, perPage, filters);
  }, [token]);

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button variant="outline" className="mb-4 gap-2" onClick={() => navigate(ROUTE.ADMIN_DEVICES.path)}>
          <ArrowLeft className="w-4 h-4" />
          Back to Devices
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-waterbase-950 mb-2">All Sensor Telemetry</h1>
          <p className="text-waterbase-600">Search, sort, filter, and download telemetry from every paired sensor.</p>
        </div>

        {!token ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-700">You must be signed in to view telemetry.</CardContent>
          </Card>
        ) : (
          <TelemetryTable
            title="Telemetry Records"
            showDevice
            showStatusFilter
            downloadFilename="waterbase-telemetry.csv"
            fetchRows={fetchTelemetry}
          />
        )}
      </div>
    </div>
  );
};

export default AdminTelemetry;
