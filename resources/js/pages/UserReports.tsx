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
import { Loader2, ChevronLeft, MapPin, Calendar, AlertCircle } from "lucide-react";

interface Report {
  id: number;
  title?: string;
  address: string;
  latitude: number;
  longitude: number;
  pollutionType: string;
  status: 'pending' | 'verified' | 'declined' | 'resolved';
  severityByUser: string;
  severityByAI?: string;
  ai_confidence?: number;
  image?: string;
  created_at: string;
  updated_at: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

export const UserReports = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pollutionFilter, setPollutionFilter] = useState("all");

  useEffect(() => {
    fetchUserReports();
  }, [token]);

  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, statusFilter, pollutionFilter]);

  const fetchUserReports = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.pollutionType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (pollutionFilter !== "all") {
      filtered = filtered.filter((r) => r.pollutionType === pollutionFilter);
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

  const getPollutionTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUniquePollutionTypes = () => {
    const types = new Set(reports.map((r) => r.pollutionType));
    return Array.from(types).sort();
  };

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-waterbase-950">My Report History</h1>
            <p className="text-waterbase-600 mt-1">View all your pollution reports</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-waterbase-200">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-waterbase-700 block mb-2">
                  Search Location
                </label>
                <Input
                  placeholder="Search by address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-waterbase-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-waterbase-700 block mb-2">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-waterbase-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-waterbase-700 block mb-2">
                  Pollution Type
                </label>
                <Select value={pollutionFilter} onValueChange={setPollutionFilter}>
                  <SelectTrigger className="border-waterbase-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {getUniquePollutionTypes().map((type) => (
                      <SelectItem key={type} value={type}>
                        {getPollutionTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-waterbase-500" />
            <span className="text-waterbase-600">Loading your reports...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <Card className="border-waterbase-200">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-waterbase-300" />
              <p className="text-waterbase-600 text-lg">No reports found</p>
              <p className="text-waterbase-500 text-sm mt-2">
                {reports.length === 0 ? "You haven't submitted any reports yet" : "Try adjusting your filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-waterbase-600">
              Showing {filteredReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''}
            </p>
            {filteredReports.map((report) => (
              <Card key={report.id} className="border-waterbase-200 hover:border-waterbase-400 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-waterbase-950">
                          {getPollutionTypeLabel(report.pollutionType)}
                        </h3>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-waterbase-600">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span>{report.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-waterbase-600">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>Reported on {formatDate(report.created_at)}</span>
                        </div>
                      </div>

                      {report.ai_confidence !== undefined && (
                        <div className="mt-4 pt-4 border-t border-waterbase-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-waterbase-600">Your Assessment:</span>
                              <p className="font-medium text-waterbase-950 mt-1">
                                {report.severityByUser ? report.severityByUser.charAt(0).toUpperCase() + report.severityByUser.slice(1) : 'N/A'}
                              </p>
                            </div>
                            {report.severityByAI && (
                              <div>
                                <span className="text-waterbase-600">AI Assessment:</span>
                                <p className="font-medium text-waterbase-950 mt-1">
                                  {report.severityByAI.charAt(0).toUpperCase() + report.severityByAI.slice(1)} 
                                  <span className="text-xs text-waterbase-500 ml-2">({Math.round((report.ai_confidence || 0) * 100)}% confidence)</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {report.image && (
                      <img
                        src={report.image}
                        alt="Report"
                        className="w-24 h-24 object-cover rounded-lg ml-4 flex-shrink-0"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
