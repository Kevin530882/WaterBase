import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import {
  MapPin,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Camera,
  Calendar,
  User,
  X,
  Plus,
  BarChart3,
  Eye,
  Target,
  Droplets,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
// @ts-ignore
import 'leaflet.heat';

// Real Report interface based on API structure
interface Report {
  id: number;
  title: string;
  content: string;
  address: string;
  latitude: number;
  longitude: number;
  pollutionType: string;
  severityByUser: string;
  severityByAI?: string;
  ai_confidence?: number;
  status: string;
  user_id: number;
  verifiedBy?: number;
  created_at: string;
  updated_at: string;
  image?: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

// Custom hook for fetching and filtering reports
const useReportsData = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/reports/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const reportsArray = Array.isArray(data) ? data : data.data || [];

        const validReports = reportsArray
          .map((r: any) => ({
            ...r,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude),
          }))
          .filter((report: Report) =>
            !isNaN(report.latitude) &&
            !isNaN(report.longitude)
          );
        setReports(validReports);
      } else {
        throw new Error('Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  return { reports, loading, error, refetch: fetchReports };
};

export const MapView = () => {
  const { user } = useAuth();
  const { reports, loading, error } = useReportsData();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [viewMode, setViewMode] = useState<"standard" | "priority">("standard");

  // Debug selectedReport changes
  useEffect(() => {
    console.log('selectedReport state changed:', selectedReport);
  }, [selectedReport]);

  // Simplified report selection handler
  const handleReportSelect = (report: Report) => {
    console.log('Selecting report:', report.id, report.address);
    setSelectedReport(report);
  };

  useEffect(() => {
    let filtered = reports;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((report) =>
        report.pollutionType.toLowerCase().includes(filterType.toLowerCase()),
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((report) =>
        report.status.toLowerCase().includes(filterStatus.toLowerCase()),
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (report) =>
          report.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (report.user?.firstName + " " + report.user?.lastName).toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Priority mode: only show high and critical severity reports
    if (viewMode === "priority") {
      filtered = filtered.filter((report) => {
        const priority = getPriority(getReportSeverity(report));
        return priority === 'high' || priority === 'critical';
      });
    }

    setFilteredReports(filtered);
  }, [reports, filterType, filterStatus, searchQuery, viewMode]);

  // Helper function to get severity from report
  const getReportSeverity = (report: Report): string => {
    return report.severityByAI || report.severityByUser || 'low';
  };

  // Helper function to get priority level based on severity
  const getPriority = (severity: string): string => {
    const sev = severity.toLowerCase();
    if (sev.includes('critical')) return 'critical';
    if (sev.includes('high')) return 'high';
    if (sev.includes('medium')) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    const sev = severity.toLowerCase();
    if (sev.includes('critical')) return "bg-red-500";
    if (sev.includes('high')) return "bg-orange-500";
    if (sev.includes('medium')) return "bg-yellow-500";
    if (sev.includes('low')) return "bg-green-500";
    return "bg-gray-500";
  };

  // Add this function before the component
  const createPollutionIcon = (report: Report) => {
    const severity = getReportSeverity(report);
    const dropletHtml = renderToStaticMarkup(
      <div className={cn(
        "w-8 h-8 flex items-center justify-center rounded-full border-2 shadow-lg bg-white",
        getSeverityColor(severity)
      )}>
        <Droplets className="w-5 h-5 text-white" />
      </div>
    );

    return L.divIcon({
      html: dropletHtml,
      className: 'custom-droplet-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Heatmap component with error handling
  const HeatmapLayer = ({ reports }: { reports: Report[] }) => {
    useEffect(() => {
      try {
        const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
        if (!mapElement) return;

        // Get the Leaflet map instance
        const mapInstance = (window as any).mapInstance;
        if (!mapInstance) return;

        // Clear existing heatmap layers
        mapInstance.eachLayer((layer: any) => {
          if (layer.options && layer.options.heatmapLayer) {
            mapInstance.removeLayer(layer);
          }
        });

        // Only add heatmap if we have leaflet.heat and reports
        if (!reports || reports.length === 0) return;
        if (!(L as any).heatLayer) {
          console.warn('Leaflet heatmap plugin not available');
          return;
        }

        // Prepare heatmap data with severity-based intensity
        const heatmapData = reports.map(report => {
          const severity = getReportSeverity(report);
          let intensity = 0.3; // default intensity

          // Set intensity based on severity
          switch (severity.toLowerCase()) {
            case 'critical':
              intensity = 1.0;
              break;
            case 'high':
              intensity = 0.8;
              break;
            case 'medium':
              intensity = 0.6;
              break;
            case 'low':
              intensity = 0.4;
              break;
          }

          return [report.latitude, report.longitude, intensity];
        });

        if (heatmapData.length > 0) {
          const heatLayer = (L as any).heatLayer(heatmapData, {
            radius: 25,
            blur: 20,
            maxZoom: 18,
            gradient: {
              0.2: '#00ff00', // green for low
              0.4: '#ffff00', // yellow for medium
              0.6: '#ff8000', // orange for high
              1.0: '#ff0000'  // red for critical
            },
            heatmapLayer: true, // Custom flag to identify our heatmap layers
          });

          heatLayer.addTo(mapInstance);
        }
      } catch (error) {
        console.error('Error in HeatmapLayer:', error);
      }
    }, [reports]);

    return null;
  }; const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "declined":
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  // Helper function to format report display data
  const formatReportForDisplay = (report: Report) => {
    const severity = getReportSeverity(report);
    return {
      ...report,
      location: report.address || 'Unknown Location',
      type: report.pollutionType || 'Unknown Type',
      severity,
      reportedBy: report.user
        ? `${report.user.firstName} ${report.user.lastName}`
        : 'Anonymous',
      reportedAt: new Date(report.created_at).toLocaleDateString(),
      description: report.content || 'No description provided',
      coordinates: { lat: report.latitude, lng: report.longitude },
      images: 1, // Default to 1 if image exists
      verificationScore: report.ai_confidence || 0,
      priority: getPriority(severity),
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
            <p className="text-waterbase-600">Loading pollution reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Reports</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Enhanced Sidebar */}
        <div className="w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Header with View Toggle */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-waterbase-950">
                Pollution Reports
              </h2>
              <div className="flex space-x-1">
                <Button
                  variant={viewMode === "standard" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("standard")}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Standard
                </Button>
                <Button
                  variant={viewMode === "priority" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("priority")}
                  className="text-xs"
                >
                  <Target className="w-3 h-3 mr-1" />
                  Priority
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-2 mb-4">
              <Link to="/report">
                <Button className="w-full bg-waterbase-500 hover:bg-waterbase-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit New Report
                </Button>
              </Link>
              {/* Only show Research Analysis button for researchers */}
              {user?.role === 'researcher' && (
                <Link to="/research-map">
                  <Button
                    variant="outline"
                    className="w-full border-enviro-300 text-enviro-700 hover:bg-enviro-50"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Research Analysis
                  </Button>
                </Link>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search locations, descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Type
                </label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="industrial">Industrial Waste</SelectItem>
                    <SelectItem value="plastic">Plastic Pollution</SelectItem>
                    <SelectItem value="sewage">Sewage Discharge</SelectItem>
                    <SelectItem value="chemical">Chemical Pollution</SelectItem>
                    <SelectItem value="trash">Trash/Debris</SelectItem>
                    <SelectItem value="oil">Oil Spill</SelectItem>
                    <SelectItem value="algae">Algae Bloom</SelectItem>
                    <SelectItem value="clean">Clean</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Status
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Priority Zone Highlights */}
          {viewMode === "priority" && (
            <div className="p-4 border-b border-gray-200 bg-red-50">
              <h3 className="text-sm font-semibold text-red-900">
                High-Priority Areas
              </h3>
            </div>
          )}

          {/* Reports list */}
          <div className="flex-1 overflow-y-auto">
            {filteredReports.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Filter className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No reports match your filters</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredReports.map((report) => {
                  try {
                    const formatted = formatReportForDisplay(report);
                    return (
                      <Card
                        key={report.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedReport?.id === report.id
                            ? "ring-2 ring-waterbase-500"
                            : "",
                          viewMode === "priority" && formatted.priority === "critical"
                            ? "border-red-300 bg-red-50"
                            : viewMode === "priority" && formatted.priority === "high"
                              ? "border-orange-300 bg-orange-50"
                              : "",
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleReportSelect(report);
                        }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-medium text-waterbase-950">
                                {formatted.location}
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-600 mt-1">
                                {formatted.type}
                              </CardDescription>
                              <CardDescription className="text-xs text-gray-500 mt-1">
                                {report.address}
                              </CardDescription>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div
                                className={cn(
                                  "w-3 h-3 rounded-full",
                                  getSeverityColor(formatted.severity),
                                )}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(report.status)}
                              <span>{report.status}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatted.reportedAt}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {formatted.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  } catch (error) {
                    console.error('Error rendering card for report:', report.id, error);
                    return null;
                  }
                })}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Map area */}
        <div className="flex-1 relative bg-gradient-to-br from-waterbase-100 to-enviro-100">
          {/* Map placeholder with enhanced visualization */}
          <div className="absolute inset-0">
            {/* Background map simulation */}
            <div className="w-full h-full relative overflow-hidden">
              {/* Simulated map background */}
              <MapContainer
                center={[14.4793, 120.9106]}
                zoom={10}
                className="w-full h-full"
                style={{ height: "100%", width: "100%" }}
                ref={(mapInstance) => {
                  if (mapInstance) {
                    (window as any).mapInstance = mapInstance;
                  }
                }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Add heatmap layer */}
                <HeatmapLayer reports={filteredReports} />

                {/* Pollution report markers */}
                {filteredReports.map((report) => {
                  try {
                    return (
                      <Marker
                        key={report.id}
                        position={[report.latitude, report.longitude]}
                        icon={createPollutionIcon(report)}
                        eventHandlers={{
                          click: () => {
                            handleReportSelect(report);
                          },
                        }}
                      >
                        <Popup>
                          <div className="text-center min-w-[200px]">
                            <div className="flex items-center justify-center mb-2">
                              <Droplets className="w-4 h-4 mr-1 text-waterbase-600" />
                              <span className="font-semibold">{report.address || 'Unknown Location'}</span>
                            </div>
                            <div className={cn("p-2 rounded mb-2", getSeverityColor(getReportSeverity(report)))}>
                              <div className="text-sm font-bold text-white">{report.pollutionType || 'Unknown Type'}</div>
                              <div className="text-xs text-white">{getReportSeverity(report)} Severity</div>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">
                              <div className="flex items-center justify-center space-x-1 mb-1">
                                {getStatusIcon(report.status)}
                                <span>{report.status}</span>
                              </div>
                              <div>Reported by: {report.user ? `${report.user.firstName} ${report.user.lastName}` : 'Anonymous'}</div>
                              <div>Date: {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Unknown'}</div>
                            </div>
                            <p className="text-xs text-gray-700">{report.content || 'No description available'}</p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  } catch (error) {
                    console.error('Error rendering marker for report:', report.id, error);
                    return null;
                  }
                })}
              </MapContainer>
            </div>
          </div>

          {/* Selected report details overlay */}
          {selectedReport && (
            <div
              className="fixed top-20 right-4 w-80 bg-white rounded-lg shadow-2xl border border-gray-200"
              style={{ zIndex: 50000 }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-waterbase-950">
                    Report Details
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedReport(null)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <MapPin className="w-4 h-4 text-waterbase-600" />
                      <span className="font-medium text-sm">
                        {selectedReport.address}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-6 mb-2">
                      {selectedReport.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {selectedReport.pollutionType}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          getSeverityColor(getReportSeverity(selectedReport)),
                        )}
                      />
                      <span className="text-xs text-gray-600">
                        {getReportSeverity(selectedReport)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    <strong>Coordinates:</strong>{" "}
                    {selectedReport.latitude.toFixed(6)},{" "}
                    {selectedReport.longitude.toFixed(6)}
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>
                        {selectedReport.user
                          ? `${selectedReport.user.firstName} ${selectedReport.user.lastName}`
                          : 'Anonymous'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(selectedReport.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(selectedReport.status)}
                      <span className="text-sm font-medium">
                        {selectedReport.status}
                      </span>
                    </div>
                    {selectedReport.image && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                        <Camera className="w-3 h-3" />
                        <span>Has photo</span>
                      </div>
                    )}
                  </div>

                  {selectedReport.ai_confidence && (
                    <div className="text-xs text-gray-600">
                      AI Verification:{" "}
                      {selectedReport.ai_confidence}%
                      confidence
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
