import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  FileText,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalReports: number;
  reportsGrowth: number;
  verifiedReports: number;
  verificationRate: number;
  activeUsers: number;
  userGrowth: number;
  totalEvents: number;
  thisMonthEvents: number;
}

interface RecentReport {
  id: number;
  location: string;
  type: string;
  severity: string;
  time: string;
  status: string;
  reporter: string;
}

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  confidence: number;
}

interface ForecastResponse {
  metric: string;
  region: string;
  horizon_days: number;
  evaluation: {
    best_model: string;
    models: Array<{ name: string; mae: number; rmse: number; directional_accuracy: number }>;
  };
  drift: {
    status: string;
    mean_shift: number;
    variance_shift: number;
  };
  forecast: ForecastPoint[];
  model: {
    version: string;
    rollback_version: string;
    retrain_schedule: string;
    generated_at: string;
  };
}

export const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastMetric, setForecastMetric] = useState('report_volume');
  const [horizon, setHorizon] = useState(30);
  const [cleanupIntensity, setCleanupIntensity] = useState(1);
  const [interventionDelayDays, setInterventionDelayDays] = useState(0);

  const getSeverityColor = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch (severityLower) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  useEffect(() => {
    fetchForecast();
  }, [token, forecastMetric, horizon, cleanupIntensity, interventionDelayDays]);

  const fetchDashboardData = async () => {
    try {
      if (!token) {
        console.error('No token found - user needs to log in');
        setStats({
          totalReports: 0,
          reportsGrowth: 0,
          verifiedReports: 0,
          verificationRate: 0,
          activeUsers: 0,
          userGrowth: 0,
          totalEvents: 0,
          thisMonthEvents: 0
        });
        setLoading(false);
        return;
      }

      console.log('Fetching dashboard stats...');
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Stats response status:', statsResponse.status);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats data received:', statsData);
        setStats(statsData);
      } else {
        console.error('Stats response error:', await statsResponse.text());
      }

      console.log('Fetching recent reports...');
      // Fetch recent reports
      const reportsResponse = await fetch('/api/dashboard/recent-reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Reports response status:', reportsResponse.status);
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        console.log('Reports data received:', reportsData);
        setRecentReports(reportsData);
      } else {
        console.error('Reports response error:', await reportsResponse.text());
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecast = async () => {
    if (!token) {
      return;
    }

    setForecastLoading(true);
    try {
      const params = new URLSearchParams({
        metric: forecastMetric,
        horizon: String(horizon),
        cleanup_intensity: String(cleanupIntensity),
        intervention_delay_days: String(interventionDelayDays),
      });

      const response = await fetch(`/api/forecast?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch forecast');
      }

      const payload = await response.json();
      setForecast(payload);
    } catch (error) {
      console.error('Error fetching forecast:', error);
    } finally {
      setForecastLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-waterbase-950 mb-2">
            Environmental Dashboard
          </h1>
          <p className="text-waterbase-700">
            Monitor water pollution reports, track environmental data, and analyze
            trends across the Philippines.
          </p>
          <p className="text-xs text-waterbase-500">
            Last updated: {new Date().toLocaleString()} - Version with real data
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-waterbase-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Reports
              </CardTitle>
              <FileText className="h-4 w-4 text-waterbase-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-waterbase-950">
                {loading ? "..." : stats?.totalReports?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-waterbase-600">
                <span className="text-enviro-600">+{stats?.reportsGrowth || 0}%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-waterbase-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Verified Reports
              </CardTitle>
              <Shield className="h-4 w-4 text-enviro-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-waterbase-950">
                {loading ? "..." : stats?.verifiedReports?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-waterbase-600">
                <span className="text-enviro-600">{stats?.verificationRate || 0}%</span> verification rate
              </p>
            </CardContent>
          </Card>

          <Card className="border-waterbase-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <Users className="h-4 w-4 text-waterbase-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-waterbase-950">
                {loading ? "..." : stats?.activeUsers?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-waterbase-600">
                <span className="text-enviro-600">+{stats?.userGrowth || 0}%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-waterbase-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cleanup Events
              </CardTitle>
              <MapPin className="h-4 w-4 text-enviro-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-waterbase-950">
                {loading ? "..." : stats?.totalEvents?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-waterbase-600">
                <span className="text-enviro-600">+{stats?.thisMonthEvents || 0}</span> this month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
          {/* Recent Reports */}
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">
                Recent Reports
              </CardTitle>
              <CardDescription className="text-waterbase-600">
                Latest pollution reports submitted to the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center text-waterbase-600">Loading recent reports...</div>
                ) : recentReports.length > 0 ? (
                  recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 bg-waterbase-50 rounded-lg border border-waterbase-100"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-waterbase-950 mb-1">
                          {report.location}
                        </div>
                        <div className="text-xs text-waterbase-600 mb-1">
                          Type: {report.type}
                        </div>
                        <div className="text-xs text-waterbase-500">
                          Reported by: {report.reporter}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity)}`}
                        >
                          {report.severity}
                        </span>
                        <span className="text-xs text-waterbase-600 whitespace-nowrap">
                          {report.time}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-waterbase-600">No recent reports found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">
                Reports by Region
              </CardTitle>
              <CardDescription className="text-waterbase-600">
                Geographic distribution of pollution reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-br from-waterbase-100 to-enviro-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-waterbase-500 mx-auto mb-4" />
                  <p className="text-waterbase-600">
                    Chart visualization coming soon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">
                Pollution Trends
              </CardTitle>
              <CardDescription className="text-waterbase-600">
                Forecast with confidence bands and scenario controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={forecastMetric}
                    onChange={(e) => setForecastMetric(e.target.value)}
                    className="border border-waterbase-200 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="report_volume">Report Volume</option>
                    <option value="severity_mix">Severity Mix</option>
                    <option value="hotspot_recurrence">Hotspot Recurrence</option>
                    <option value="cleanup_completion_lead_time">Cleanup Lead Time</option>
                  </select>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(Number(e.target.value))}
                    className="border border-waterbase-200 rounded-md px-2 py-1 text-sm"
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                  </select>
                  <label className="text-xs text-waterbase-700">
                    Cleanup intensity: {cleanupIntensity.toFixed(1)}x
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.1}
                      value={cleanupIntensity}
                      onChange={(e) => setCleanupIntensity(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                  <label className="text-xs text-waterbase-700">
                    Intervention delay: {interventionDelayDays}d
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={interventionDelayDays}
                      onChange={(e) => setInterventionDelayDays(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                </div>

                {forecastLoading ? (
                  <div className="h-48 bg-gradient-to-br from-waterbase-100 to-enviro-100 rounded-lg flex items-center justify-center">
                    <p className="text-waterbase-600">Generating forecast...</p>
                  </div>
                ) : forecast && forecast.forecast.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-waterbase-50 border border-waterbase-200 text-xs text-waterbase-700">
                      <div>Model: <span className="font-semibold">{forecast.evaluation.best_model}</span> | Version: {forecast.model.version}</div>
                      <div>Drift: <span className="font-semibold">{forecast.drift.status}</span> (mean shift {forecast.drift.mean_shift}, variance shift {forecast.drift.variance_shift})</div>
                    </div>

                    <div className="h-48 overflow-auto space-y-1">
                      {forecast.forecast.slice(0, 20).map((point) => {
                        const upper = Math.max(point.upper, 0.001);
                        const pct = Math.min(100, Math.round((point.predicted / upper) * 100));
                        return (
                          <div key={point.date} className="text-xs">
                            <div className="flex justify-between text-waterbase-700 mb-1">
                              <span>{point.date}</span>
                              <span>
                                {point.predicted.toFixed(2)} ({point.lower.toFixed(2)} - {point.upper.toFixed(2)})
                              </span>
                            </div>
                            <div className="h-2 bg-waterbase-100 rounded">
                              <div className="h-2 bg-enviro-500 rounded" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-waterbase-100 to-enviro-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 text-enviro-500 mx-auto mb-4" />
                      <p className="text-waterbase-600">No forecast data available yet</p>
                    </div>
                  </div>
                )}
                </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-waterbase-600 text-sm">
            Dashboard features are coming soon. This will include real-time
            analytics, detailed reporting, data visualization, and
            administrative tools.
          </p>
        </div>
      </div>
    </div>
  );
};