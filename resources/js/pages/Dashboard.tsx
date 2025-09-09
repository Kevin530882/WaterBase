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

export const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

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
                Monthly trends in pollution reporting and cleanup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-br from-waterbase-100 to-enviro-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-enviro-500 mx-auto mb-4" />
                  <p className="text-waterbase-600">
                    Trend analysis coming soon
                  </p>
                </div>
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