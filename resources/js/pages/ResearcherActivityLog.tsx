import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, ChevronLeft, MapPin, Calendar, AlertCircle, Award } from "lucide-react";

interface Report {
  id: number;
  address: string;
  pollutionType: string;
  status: 'pending' | 'verified' | 'declined' | 'resolved';
  severityByUser: string;
  created_at: string;
}

interface TrendDataPoint {
  month: string;
  count: number;
}

interface RegionDataPoint {
  region: string;
  count: number;
}

interface UserStats {
  dataAnalyzed?: number;
  researchPublished?: number;
  reportsSubmitted?: number;
  accuracyRate?: number;
  badges?: string[];
}

export const ResearcherActivityLog = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  
  // Charts data
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [regionData, setRegionData] = useState<RegionDataPoint[]>([]);
  
  // Stats and badges
  const [stats, setStats] = useState<UserStats>({});
  const [badges, setBadges] = useState<string[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'trends' | 'badges'>('reports');

  useEffect(() => {
    fetchAllData();
  }, [token]);

  useEffect(() => {
    filterReports();
  }, [reports, reportSearchQuery, reportStatusFilter]);

  const fetchAllData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      
      // Fetch reports
      const reportsRes = await fetch('/api/reports/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (reportsRes.ok) {
        setReports(await reportsRes.json());
      }

      // Fetch trend data
      try {
        const trendRes = await fetch('/api/dashboard/monthly-trends', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (trendRes.ok) {
          const data = await trendRes.json();
          setTrendData(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Error fetching trend data:', e);
      }

      // Fetch region data
      try {
        const regionRes = await fetch('/api/dashboard/reports-by-region', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (regionRes.ok) {
          const data = await regionRes.json();
          setRegionData(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Error fetching region data:', e);
      }

      // Fetch stats
      const statsRes = await fetch('/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        if (statsData.badges) {
          setBadges(statsData.badges);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (reportSearchQuery) {
      filtered = filtered.filter(
        (r) => r.address.toLowerCase().includes(reportSearchQuery.toLowerCase())
      );
    }

    if (reportStatusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === reportStatusFilter);
    }

    setFilteredReports(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBadgeIcon = (badgeName: string) => {
    const name = badgeName?.toLowerCase() || '';
    if (name.includes('water') || name.includes('clean')) return '💧';
    if (name.includes('eco') || name.includes('green')) return '🌱';
    if (name.includes('champion') || name.includes('hero')) return '🏆';
    if (name.includes('guardian') || name.includes('protector')) return '🛡️';
    if (name.includes('volunteer') || name.includes('helper')) return '🤝';
    if (name.includes('leader') || name.includes('captain')) return '⭐';
    return '🏅';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPollutionTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const renderReportsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-waterbase-700 block mb-2">Search Location</label>
          <Input
            placeholder="Search by address..."
            value={reportSearchQuery}
            onChange={(e) => setReportSearchQuery(e.target.value)}
            className="border-waterbase-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-waterbase-700 block mb-2">Status</label>
          <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
            <SelectTrigger className="border-waterbase-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <Card className="border-waterbase-200">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-waterbase-300" />
            <p className="text-waterbase-600">No reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <Card key={report.id} className="border-waterbase-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-waterbase-950">
                        {getPollutionTypeLabel(report.pollutionType)}
                      </h3>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-waterbase-600">
                      <MapPin className="w-4 h-4" />
                      <span>{report.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-waterbase-600 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(report.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderTrendsTab = () => (
    <div className="space-y-6">
      {/* Monthly Trends Chart */}
      {trendData.length > 0 && (
        <Card className="border-waterbase-200">
          <CardHeader>
            <CardTitle>Monthly Report Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#0369a1" 
                  strokeWidth={2}
                  name="Reports"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Regional Distribution Chart */}
      {regionData.length > 0 && (
        <Card className="border-waterbase-200">
          <CardHeader>
            <CardTitle>Reports by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="count" 
                  fill="#22c55e"
                  name="Reports"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {trendData.length === 0 && regionData.length === 0 && (
        <Card className="border-waterbase-200">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-waterbase-300" />
            <p className="text-waterbase-600">No trend data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderBadgesTab = () => (
    <div className="space-y-4">
      {badges.length === 0 ? (
        <Card className="border-waterbase-200">
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-waterbase-300" />
            <p className="text-waterbase-600">No badges earned yet</p>
            <p className="text-waterbase-500 text-sm mt-2">Complete research and analysis to earn badges</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-waterbase-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {badges.map((badge, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full border-2 border-yellow-300 mb-2">
                    <span className="text-2xl">{getBadgeIcon(badge)}</span>
                  </div>
                  <p className="text-xs font-medium text-waterbase-950 text-center">{badge}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-waterbase-50">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-waterbase-500" />
          <span className="text-waterbase-600">Loading activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-waterbase-950">My Research Activity</h1>
            <p className="text-waterbase-600 mt-1">View your reports, research trends, and analysis</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-waterbase-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-waterbase-950">{stats.reportsSubmitted || 0}</div>
              <div className="text-sm text-waterbase-600">Reports Submitted</div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-waterbase-950">{stats.dataAnalyzed || 0}</div>
              <div className="text-sm text-waterbase-600">Data Sets Analyzed</div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-waterbase-950">{stats.researchPublished || 0}</div>
              <div className="text-sm text-waterbase-600">Research Published</div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-waterbase-950">{stats.badgesEarned || 0}</div>
              <div className="text-sm text-waterbase-600">Badges Earned</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-waterbase-200">
          <Button
            variant={activeTab === 'reports' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('reports')}
            className="rounded-none border-b-2"
          >
            Reports ({reports.length})
          </Button>
          <Button
            variant={activeTab === 'trends' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('trends')}
            className="rounded-none border-b-2"
          >
            Trends & Analysis
          </Button>
          <Button
            variant={activeTab === 'badges' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('badges')}
            className="rounded-none border-b-2"
          >
            Badges ({badges.length})
          </Button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'reports' && renderReportsTab()}
          {activeTab === 'trends' && renderTrendsTab()}
          {activeTab === 'badges' && renderBadgesTab()}
        </div>
      </div>
    </div>
  );
};
