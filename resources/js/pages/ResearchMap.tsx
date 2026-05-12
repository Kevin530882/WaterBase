import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
// @ts-ignore
import "leaflet.heat";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Download,
  Droplets,
  Eye,
  FileSpreadsheet,
  Gauge,
  Layers,
  Loader2,
  MapPin,
  Microscope,
  ShieldCheck,
  Thermometer,
  TrendingUp,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTE } from "@/constants";
import DeviceService, {
  ResearchCleanupEvent,
  ResearchCleanupRanking,
  ResearchStation,
  ResearchTrendPoint,
} from "@/services/deviceService";

interface ReportMarker {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  pollutionType: string;
  severityByAI?: string;
  severityByUser: string;
  severityPercentage?: number;
  status: string;
  created_at: string;
}

interface SummaryData {
  sensor_score: number | null;
  report_score: number | null;
  master_wbsi: number | null;
  national_wbsi?: number | null;
  severity_label: string | null;
  station_count: number;
  report_count: number;
  area_count?: number;
  combined_count?: number;
  report_only_count?: number;
  sensor_only_count?: number;
  last_updated_at?: string | null;
}

const currentYear = new Date().getFullYear();

const demoStations: ResearchStation[] = import.meta.env.DEV ? [
  {
    id: 0,
    station_id: "sample-station",
    name: "Sample Freshwater Station",
    latitude: 14.5794,
    longitude: 120.9647,
    status: "sample",
    environment_type: "freshwater",
    last_seen_at: new Date().toISOString(),
    latest_telemetry: {
      id: 0,
      device_id: 0,
      recorded_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      latency_ms: null,
      temperature_celsius: 28.2,
      ph: 7.1,
      turbidity_ntu: 8.4,
      tds_mg_l: 180,
      water_level_cm: null,
      dissolved_oxygen_mg_l: null,
      conductivity_us_cm: null,
      raw_payload: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    scores: {
      sensor_score: 8.9,
      severity_label: "Low",
      report_score: null,
      master_wbsi: 8.9,
      master_severity_label: "Low",
    },
  },
] : [];

const severityClass = (score?: number | null) => {
  if (score === null || score === undefined) return "text-gray-700 bg-gray-50 border-gray-200";
  if (score < 25) return "text-green-700 bg-green-50 border-green-200";
  if (score < 50) return "text-yellow-700 bg-yellow-50 border-yellow-200";
  if (score < 75) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-red-700 bg-red-50 border-red-200";
};

const severityColor = (score?: number | null) => {
  if (score === null || score === undefined) return "bg-gray-500";
  if (score < 25) return "bg-green-500";
  if (score < 50) return "bg-yellow-500";
  if (score < 75) return "bg-orange-500";
  return "bg-red-500";
};

const reportScore = (report: ReportMarker) => {
  if (typeof report.severityPercentage === "number") return report.severityPercentage;
  const severity = (report.severityByAI || report.severityByUser || "").toLowerCase();
  if (severity.includes("critical")) return 87.5;
  if (severity.includes("high")) return 62.5;
  if (severity.includes("medium") || severity.includes("moderate")) return 37.5;
  return 12.5;
};

const sensorIcon = (station: ResearchStation) => L.divIcon({
  html: renderToStaticMarkup(
    <div className={cn("w-8 h-8 flex items-center justify-center rounded-full border-2 shadow-lg border-white", severityColor(station.scores?.master_wbsi ?? station.scores?.sensor_score))}>
      <Droplets className="w-5 h-5 text-white" />
    </div>
  ),
  className: "custom-research-sensor-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const reportIcon = (report: ReportMarker) => L.divIcon({
  html: renderToStaticMarkup(
    <div className={cn("w-7 h-7 flex items-center justify-center rounded-full border-2 shadow-lg border-white", severityColor(reportScore(report)))}>
      <AlertTriangle className="w-4 h-4 text-white" />
    </div>
  ),
  className: "custom-research-report-marker",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const cleanupIcon = () => L.divIcon({
  html: renderToStaticMarkup(
    <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 shadow-lg bg-teal-500 border-white">
      <ShieldCheck className="w-5 h-5 text-white" />
    </div>
  ),
  className: "custom-research-cleanup-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const HeatmapLayer = ({ points }: { points: Array<[number, number, number]> }) => {
  const map = useMap();

  useEffect(() => {
    if (!(L as any).heatLayer || points.length === 0) return;

    const layer = (L as any).heatLayer(points, {
      radius: 24,
      blur: 18,
      maxZoom: 18,
      gradient: { 0.2: "#22c55e", 0.45: "#eab308", 0.7: "#f97316", 1: "#ef4444" },
    });

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
};

export const ResearchMap = () => {
  const { token } = useAuth();
  const [selectedView, setSelectedView] = useState<"spatial" | "temporal">("spatial");
  const [selectedStation, setSelectedStation] = useState<ResearchStation | null>(null);
  const [stations, setStations] = useState<ResearchStation[]>([]);
  const [reports, setReports] = useState<ReportMarker[]>([]);
  const [trendData, setTrendData] = useState<ResearchTrendPoint[]>([]);
  const [cleanupEvents, setCleanupEvents] = useState<ResearchCleanupEvent[]>([]);
  const [rankings, setRankings] = useState<ResearchCleanupRanking[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState([Math.max(2020, currentYear - 1), currentYear]);
  const [selectedParameter, setSelectedParameter] = useState("sensor_score");
  const [aggregate, setAggregate] = useState("mean");
  const [showLayers, setShowLayers] = useState({
    sensors: true,
    pollution: true,
    heatmap: true,
    events: false,
  });

  const dateFilters = useMemo(() => ({
    from: `${timeRange[0]}-01-01`,
    to: `${timeRange[1]}-12-31`,
  }), [timeRange]);

  useEffect(() => {
    if (!token) return;

    const service = new DeviceService(token);
    let cancelled = false;

    const loadResearchData = async () => {
      try {
        setLoading(true);
        const [summaryResponse, trendResponse, cleanupResponse] = await Promise.all([
          service.getResearchSummary(dateFilters.from, dateFilters.to),
          service.getResearchTrends(selectedParameter, aggregate, dateFilters.from, dateFilters.to),
          service.getResearchCleanups(dateFilters.from, dateFilters.to),
        ]);

        if (cancelled) return;

        const loadedStations = summaryResponse.stations.length > 0 ? summaryResponse.stations : demoStations;
        setStations(loadedStations);
        setReports(summaryResponse.reports);
        setSummary(summaryResponse.summary);
        setTrendData(trendResponse.data);
        setCleanupEvents(cleanupResponse.events);
        setRankings(cleanupResponse.rankings);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load research map data");
        if (import.meta.env.DEV) setStations(demoStations);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadResearchData();

    return () => {
      cancelled = true;
    };
  }, [token, dateFilters.from, dateFilters.to, selectedParameter, aggregate]);

  const heatPoints = useMemo(() => {
    const sensorPoints = showLayers.sensors
      ? stations
        .filter((station) => station.scores?.sensor_score !== null)
        .map((station) => [station.latitude, station.longitude, (station.scores.sensor_score || 0) / 100] as [number, number, number])
      : [];

    const reportPoints = showLayers.pollution
      ? reports.map((report) => [Number(report.latitude), Number(report.longitude), reportScore(report) / 100] as [number, number, number])
      : [];

    return [...sensorPoints, ...reportPoints];
  }, [reports, showLayers.pollution, showLayers.sensors, stations]);

  const selectedValueLabel = selectedParameter === "master_wbsi"
    ? "Master WBSI"
    : selectedParameter === "report_score"
      ? "Report Score"
      : selectedParameter === "sensor_score"
        ? "Sensor Score"
        : selectedParameter.toUpperCase();

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const csvCell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const exportWaterQualityReport = () => {
    const generatedAt = new Date().toISOString();
    const lines = [
      "WaterbasePH Water Quality Report",
      `Generated At: ${generatedAt}`,
      `Period: ${dateFilters.from} to ${dateFilters.to}`,
      "",
      "National Summary",
      `National WBSI: ${summary?.national_wbsi ?? "N/A"}`,
      `Severity: ${summary?.severity_label ?? "N/A"}`,
      `Areas: ${summary?.area_count ?? 0}`,
      `Combined Areas: ${summary?.combined_count ?? 0}`,
      `Report-only Areas: ${summary?.report_only_count ?? 0}`,
      `Sensor-only Areas: ${summary?.sensor_only_count ?? 0}`,
      "",
      "Sensor Summary",
      `Stations: ${stations.length}`,
      `Average Sensor Score: ${summary?.sensor_score ?? "N/A"}`,
      "",
      "Report Summary",
      `Reports: ${reports.length}`,
      `Average Report Score: ${summary?.report_score ?? "N/A"}`,
      "",
      "Cleanup Events",
      `Events: ${cleanupEvents.length}`,
      "",
      "Top Organization Activity",
      ...rankings.slice(0, 10).map((ranking, index) => `${index + 1}. ${ranking.organization}: ${ranking.events_count} events, ${ranking.volunteers_count} volunteers`),
    ];

    downloadFile(`water-quality-report-${dateFilters.from}-to-${dateFilters.to}.txt`, lines.join("\n"), "text/plain;charset=utf-8");
  };

  const downloadRawCsv = () => {
    const rows = [
      ["dataset", "id", "name_or_type", "latitude", "longitude", "recorded_at", "score_or_value", "extra"],
      ...stations.map((station) => [
        "sensor",
        station.id,
        station.name || station.station_id || "Sensor Station",
        station.latitude,
        station.longitude,
        station.latest_telemetry?.recorded_at || station.last_seen_at || "",
        station.scores?.sensor_score ?? "",
        `pH=${station.latest_telemetry?.ph ?? ""};tds=${station.latest_telemetry?.tds_mg_l ?? ""};turbidity=${station.latest_telemetry?.turbidity_ntu ?? ""};temp=${station.latest_telemetry?.temperature_celsius ?? ""}`,
      ]),
      ...reports.map((report) => [
        "report",
        report.id,
        report.pollutionType,
        report.latitude,
        report.longitude,
        report.created_at,
        reportScore(report),
        `status=${report.status};address=${report.address}`,
      ]),
      ...cleanupEvents.map((event) => [
        "event",
        event.id,
        event.title,
        event.latitude,
        event.longitude,
        event.date,
        event.attendees_count ?? event.currentVolunteers ?? "",
        `status=${event.status};address=${event.address}`,
      ]),
      ...trendData.map((point) => [
        "trend",
        point.date,
        selectedParameter,
        "",
        "",
        point.date,
        point.value,
        `aggregate=${aggregate};count=${point.count}`,
      ]),
    ];

    downloadFile(
      `waterbase-raw-data-${dateFilters.from}-to-${dateFilters.to}.csv`,
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
      "text/csv;charset=utf-8"
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <Link to="/map">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h2 className="text-lg font-semibold text-waterbase-950">Water Quality Research</h2>
            </div>
            <p className="text-sm text-waterbase-600">Comprehensive geotemporal analysis with scientific water quality data</p>
            <Link to={ROUTE.RESEARCH_DEVICES.path}>
              <Button variant="outline" size="sm" className="mt-3 w-full justify-start">
                <Eye className="w-4 h-4 mr-2" />
                View Devices
              </Button>
            </Link>
          </div>

          <div className="p-4 border-b border-gray-200">
            <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as "spatial" | "temporal")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="spatial" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  Spatial
                </TabsTrigger>
                <TabsTrigger value="temporal" className="text-xs">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Temporal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading && (
            <div className="p-4 flex items-center gap-2 text-sm text-waterbase-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading geotemporal data...
            </div>
          )}

          {error && (
            <div className="m-4 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
          )}

          <div className="flex-1 overflow-y-auto">
            {summary && (
              <div className="p-4 border-b border-gray-100">
                <div className={cn("p-3 rounded-lg border", severityClass(summary.national_wbsi ?? summary.master_wbsi ?? summary.sensor_score))}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">National WBSI</span>
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold mt-1">{summary.national_wbsi ?? "N/A"}</div>
                  <div className="text-xs mt-1">
                    Areas: {summary.area_count ?? 0} | Combined: {summary.combined_count ?? 0} | Report-only: {summary.report_only_count ?? 0} | Sensor-only: {summary.sensor_only_count ?? 0}
                  </div>
                </div>
              </div>
            )}

            {selectedView === "spatial" && (
              <div className="p-4 space-y-4">
                <Card className="border-waterbase-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Layers className="w-4 h-4 mr-2" />
                      Map Layers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(showLayers).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {key === "sensors" && <Droplets className="w-4 h-4 text-waterbase-600" />}
                          {key === "pollution" && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          {key === "heatmap" && <Activity className="w-4 h-4 text-orange-600" />}
                          {key === "events" && <Calendar className="w-4 h-4 text-blue-600" />}
                          <span className="text-sm text-gray-700 capitalize">
                            {key}
                          </span>
                        </div>
                        <Switch checked={value} onCheckedChange={(checked) => setShowLayers({ ...showLayers, [key]: checked })} />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {showLayers.sensors && (
                  <Card className="border-waterbase-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Microscope className="w-4 h-4 mr-2" />
                        Sensor Stations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {stations.length === 0 && <div className="text-sm text-gray-500">No sensor stations found for this range.</div>}
                      {stations.map((station) => (
                        <div
                          key={station.id}
                          className={cn("p-3 rounded-lg cursor-pointer transition-all hover:shadow-sm border", severityClass(station.scores?.master_wbsi ?? station.scores?.sensor_score), selectedStation?.id === station.id ? "ring-2 ring-waterbase-500" : "")}
                          onClick={() => setSelectedStation(station)}
                        >
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <span className="text-sm font-medium">{station.name || station.station_id}</span>
                            <Badge variant="outline" className="text-xs">{station.environment_type || "freshwater"}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>Sensor: {station.scores?.sensor_score ?? "N/A"}</span>
                            <span>Master: {station.scores?.master_wbsi ?? "N/A"}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Updated: {station.last_seen_at ? new Date(station.last_seen_at).toLocaleString() : "Unknown"}
                          </div>
                          <Progress value={station.scores?.master_wbsi ?? station.scores?.sensor_score ?? 0} className="mt-2 h-1" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {showLayers.events && (
                  <Card className="border-waterbase-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Cleanup Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {rankings.length === 0 && <div className="text-sm text-gray-500">No cleanup activity found for this range.</div>}
                      {rankings.slice(0, 5).map((ranking, index) => (
                        <div key={ranking.organization} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                          <span>{index + 1}. {ranking.organization}</span>
                          <span>{ranking.events_count} events | {ranking.volunteers_count} volunteers</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {selectedView === "temporal" && (
              <div className="p-4 space-y-4">
                <Card className="border-waterbase-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Activity className="w-4 h-4 mr-2" />
                      Time Range Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Parameter to Analyze</label>
                      <Select value={selectedParameter} onValueChange={setSelectedParameter}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sensor_score">Sensor Score</SelectItem>
                          <SelectItem value="master_wbsi">Master WBSI</SelectItem>
                          <SelectItem value="report_score">Report Score</SelectItem>
                          <SelectItem value="ph">pH Level</SelectItem>
                          <SelectItem value="tds">TDS</SelectItem>
                          <SelectItem value="turbidity">Turbidity</SelectItem>
                          <SelectItem value="temperature">Temperature</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Aggregate</label>
                      <Select value={aggregate} onValueChange={setAggregate}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mean">Mean / Average</SelectItem>
                          <SelectItem value="min">Lowest Recorded</SelectItem>
                          <SelectItem value="max">Highest Recorded</SelectItem>
                          <SelectItem value="latest">Latest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Year Range: {timeRange[0]} - {timeRange[1]}</label>
                      <Slider value={timeRange} onValueChange={setTimeRange} max={currentYear} min={2020} step={1} className="w-full" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-waterbase-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {selectedValueLabel} Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {trendData.length === 0 && <div className="text-sm text-gray-500">No trend data found for this range.</div>}
                      {trendData.map((point) => (
                        <div key={point.date} className="flex items-center justify-between p-2 bg-waterbase-50 rounded">
                          <span className="text-xs text-gray-600">{point.date}</span>
                          <span className="text-sm font-medium">{point.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-waterbase-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Environmental Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cleanupEvents.slice(0, 8).map((event) => (
                      <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{event.title}</span>
                          <Badge variant={event.status === "completed" ? "default" : "outline"} className="text-xs">{event.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{event.address}</p>
                        <span className="text-xs text-gray-500">{event.date}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="p-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-waterbase-950 mb-3">Export Scientific Data</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={exportWaterQualityReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Water Quality Report
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={downloadRawCsv}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download Raw Data (CSV)
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-green-50">
          <MapContainer center={[14.4793, 120.9106]} zoom={10} className="w-full h-full" style={{ height: "100%", width: "100%" }}>
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {showLayers.heatmap && <HeatmapLayer points={heatPoints} />}

            {showLayers.sensors && stations.map((station) => (
              <Marker key={`station-${station.id}`} position={[station.latitude, station.longitude]} icon={sensorIcon(station)} eventHandlers={{ click: () => setSelectedStation(station) }}>
                <Popup>
                  <div className="text-center min-w-[220px]">
                    <div className="font-semibold mb-2">{station.name || station.station_id}</div>
                    <div className={cn("p-2 rounded mb-2", severityClass(station.scores?.master_wbsi ?? station.scores?.sensor_score))}>
                      <div className="text-sm font-bold">Sensor Score: {station.scores?.sensor_score ?? "N/A"}</div>
                      <div className="text-sm">Master WBSI: {station.scores?.master_wbsi ?? "N/A"}</div>
                      <div className="text-xs">{station.scores?.master_severity_label || station.scores?.severity_label || "No severity"}</div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>pH: {station.latest_telemetry?.ph ?? "N/A"}</div>
                      <div>TDS: {station.latest_telemetry?.tds_mg_l ?? "N/A"} mg/L</div>
                      <div>Turbidity: {station.latest_telemetry?.turbidity_ntu ?? "N/A"} NTU</div>
                      <div>Temp: {station.latest_telemetry?.temperature_celsius ?? "N/A"} C</div>
                      <div>Updated: {station.last_seen_at ? new Date(station.last_seen_at).toLocaleString() : "Unknown"}</div>
                    </div>
                    <Link to={ROUTE.RESEARCH_DEVICE_DETAIL.path.replace(':deviceId', String(station.id))}>
                      <Button size="sm" className="mt-3 w-full">
                        View Device
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}

            {showLayers.pollution && reports.map((report) => (
              <Marker key={`report-${report.id}`} position={[Number(report.latitude), Number(report.longitude)]} icon={reportIcon(report)}>
                <Popup>
                  <div className="text-center min-w-[200px]">
                    <div className="font-semibold mb-2">{report.address}</div>
                    <div className={cn("p-2 rounded mb-2", severityClass(reportScore(report)))}>
                      <div className="text-sm font-bold">{report.pollutionType}</div>
                      <div className="text-xs">Report Score: {reportScore(report)}</div>
                    </div>
                    <div className="text-xs text-gray-600">{new Date(report.created_at).toLocaleDateString()}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {showLayers.events && cleanupEvents.map((event) => (
              <Marker key={`cleanup-${event.id}`} position={[Number(event.latitude), Number(event.longitude)]} icon={cleanupIcon()}>
                <Popup>
                  <div className="text-center min-w-[200px]">
                    <div className="font-semibold mb-2">{event.title}</div>
                    <div className="bg-teal-500 text-white text-xs font-semibold px-2 py-1 rounded mb-2">{event.status}</div>
                    <div className="text-xs text-gray-600">{event.address}</div>
                    <div className="text-xs text-gray-600">Volunteers: {event.attendees_count ?? event.currentVolunteers ?? 0}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {selectedStation && (
            <div className="absolute top-4 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[80vh] overflow-y-auto" style={{ zIndex: 1000 }}>
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-waterbase-950">Detailed Water Quality Analysis</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedStation(null)} className="h-6 w-6">X</Button>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-waterbase-950 mb-1">{selectedStation.name || selectedStation.station_id}</h4>
                  <p className="text-xs text-gray-600">Coordinates: {selectedStation.latitude}, {selectedStation.longitude}</p>
                  <Badge variant="outline" className="text-xs mt-2">{selectedStation.environment_type || "freshwater"}</Badge>
                </div>
                <div className={cn("p-3 rounded-lg", severityClass(selectedStation.scores?.master_wbsi ?? selectedStation.scores?.sensor_score))}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Master WBSI</span>
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold">{selectedStation.scores?.master_wbsi ?? "N/A"}</div>
                  <div className="text-sm">{selectedStation.scores?.master_severity_label || selectedStation.scores?.severity_label || "No severity"}</div>
                  <Progress value={selectedStation.scores?.master_wbsi ?? selectedStation.scores?.sensor_score ?? 0} className="mt-2 h-2" />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Thermometer className="w-4 h-4 mr-1" />
                    Sensor Readings
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-600">pH:</span><br /><span className="font-medium">{selectedStation.latest_telemetry?.ph ?? "N/A"}</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-600">TDS:</span><br /><span className="font-medium">{selectedStation.latest_telemetry?.tds_mg_l ?? "N/A"} mg/L</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-600">Turbidity:</span><br /><span className="font-medium">{selectedStation.latest_telemetry?.turbidity_ntu ?? "N/A"} NTU</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-600">Temperature:</span><br /><span className="font-medium">{selectedStation.latest_telemetry?.temperature_celsius ?? "N/A"} C</span></div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 border-t pt-3">Last Updated: {selectedStation.last_seen_at ? new Date(selectedStation.last_seen_at).toLocaleString() : "Unknown"}</div>
                <Link to={ROUTE.RESEARCH_DEVICE_DETAIL.path.replace(':deviceId', String(selectedStation.id))}>
                  <Button className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    View Device
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
