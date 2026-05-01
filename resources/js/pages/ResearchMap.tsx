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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import Navigation from "@/components/Navigation";
import {
MapPin,
BarChart3,
TrendingUp,
TrendingDown,
Calendar,
Layers,
Filter,
Download,
FileSpreadsheet,
Eye,
EyeOff,
Clock,
Wind,
Droplets,
Thermometer,
Activity,
ArrowLeft,
AlertTriangle,
CheckCircle,
Gauge,
Microscope,
Leaf,
Factory,
Home,
TreePine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';

// Comprehensive water quality sensor data
const waterQualitySensors = [
{
    id: 1,
    name: "Manila Bay Central Station",
    coordinates: { lat: 14.5794, lng: 120.9647 },
    type: "primary",
    physicochemical: {
    ph: 7.2,
    turbidity: 15.8, // NTU
    temperature: 28.5, // °C
    conductivity: 1450, // μS/cm
    dissolvedOxygen: 4.2, // mg/L
    },
    organics: {
    bod: 8.5, // mg/L
    cod: 24.3, // mg/L
    nitrates: 2.1, // mg/L
    phosphates: 0.8, // mg/L
    },
    microbial: {
    ecoli: 150, // CFU/100ml
    fecalColiform: 280, // CFU/100ml
    },
    optical: {
    chlorophyllA: 12.5, // μg/L
    tss: 45.2, // mg/L
    cdom: 0.85, // m⁻¹
    },
    wqi: 62, // Water Quality Index
    status: "Fair",
    trend: "improving",
    lastUpdated: "2024-01-15 14:30",
},
{
    id: 2,
    name: "Pasig River East Monitoring",
    coordinates: { lat: 14.5995, lng: 121.0008 },
    type: "secondary",
    physicochemical: {
    ph: 6.8,
    turbidity: 28.5,
    temperature: 29.1,
    conductivity: 1780,
    dissolvedOxygen: 2.8,
    },
    organics: {
    bod: 15.2,
    cod: 42.6,
    nitrates: 4.5,
    phosphates: 1.6,
    },
    microbial: {
    ecoli: 450,
    fecalColiform: 820,
    },
    optical: {
    chlorophyllA: 28.7,
    tss: 78.9,
    cdom: 1.42,
    },
    wqi: 38,
    status: "Poor",
    trend: "declining",
    lastUpdated: "2024-01-15 13:45",
},
{
    id: 3,
    name: "Laguna Lake North Station",
    coordinates: { lat: 14.3591, lng: 121.2663 },
    type: "primary",
    physicochemical: {
    ph: 7.8,
    turbidity: 12.3,
    temperature: 27.9,
    conductivity: 980,
    dissolvedOxygen: 6.1,
    },
    organics: {
    bod: 4.2,
    cod: 12.8,
    nitrates: 1.2,
    phosphates: 0.4,
    },
    microbial: {
    ecoli: 45,
    fecalColiform: 85,
    },
    optical: {
    chlorophyllA: 8.9,
    tss: 22.1,
    cdom: 0.52,
    },
    wqi: 78,
    status: "Good",
    trend: "stable",
    lastUpdated: "2024-01-15 14:15",
},
];

// Historical time-series data
const timeSeriesData = [
{
    date: "2024-01-01",
    ph: 7.1,
    turbidity: 18.2,
    temperature: 27.8,
    dissolvedOxygen: 4.8,
    bod: 9.2,
    cod: 26.1,
    nitrates: 2.3,
    ecoli: 180,
    chlorophyllA: 14.2,
    wqi: 58,
},
{
    date: "2024-01-05",
    ph: 7.0,
    turbidity: 16.5,
    temperature: 28.1,
    dissolvedOxygen: 4.5,
    bod: 8.8,
    cod: 24.7,
    nitrates: 2.2,
    ecoli: 165,
    chlorophyllA: 13.1,
    wqi: 61,
},
{
    date: "2024-01-10",
    ph: 7.2,
    turbidity: 15.8,
    temperature: 28.5,
    dissolvedOxygen: 4.2,
    bod: 8.5,
    cod: 24.3,
    nitrates: 2.1,
    ecoli: 150,
    chlorophyllA: 12.5,
    wqi: 62,
},
{
    date: "2024-01-15",
    ph: 7.3,
    turbidity: 14.9,
    temperature: 28.2,
    dissolvedOxygen: 4.0,
    bod: 8.1,
    cod: 23.5,
    nitrates: 2.0,
    ecoli: 140,
    chlorophyllA: 11.8,
    wqi: 64,
},
];

// Land use context data
const landUseAreas = [
{
    type: "industrial",
    name: "Industrial Zone A",
    coordinates: { lat: 14.58, lng: 120.96 },
    impact: "high",
},
{
    type: "urban",
    name: "Urban Residential",
    coordinates: { lat: 14.59, lng: 121.01 },
    impact: "medium",
},
{
    type: "agriculture",
    name: "Agricultural Area",
    coordinates: { lat: 14.35, lng: 121.27 },
    impact: "low",
},
];

// Environmental events and interventions
const environmentalEvents = [
{
    date: "2024-01-10",
    type: "cleanup",
    title: "Manila Bay Cleanup Initiative",
    description: "Large-scale cleanup operation with 500 volunteers",
    impact: "positive",
},
{
    date: "2024-01-05",
    type: "rainfall",
    title: "Heavy Rainfall Event",
    description: "48-hour continuous rainfall causing runoff",
    impact: "negative",
},
{
    date: "2023-12-20",
    type: "spill",
    title: "Industrial Discharge Incident",
    description: "Unauthorized chemical discharge reported and contained",
    impact: "negative",
},
];

export const ResearchMap = () => {
const [selectedView, setSelectedView] = useState<"spatial" | "temporal">(
    "spatial",
);
const [selectedSensor, setSelectedSensor] = useState<
    (typeof waterQualitySensors)[0] | null
>(null);
const [timeRange, setTimeRange] = useState([2023, 2024]);
const [selectedParameter, setSelectedParameter] = useState<string>("wqi");
const [showLayers, setShowLayers] = useState({
    sensors: true,
    pollution: true,
    satellite: false,
    landuse: false,
    events: false,
});
const [researchDocuments, setResearchDocuments] = useState<Array<{
    id: number;
    title: string;
    description: string | null;
    file_path: string;
    created_at: string;
    user?: { firstName: string; lastName: string };
}>>([]);

const getWQIColor = (wqi: number) => {
    if (wqi >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (wqi >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (wqi >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (wqi >= 20) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
};

const getWQIStatus = (wqi: number) => {
    if (wqi >= 80) return "Excellent";
    if (wqi >= 60) return "Good";
    if (wqi >= 40) return "Fair";
    if (wqi >= 20) return "Poor";
    return "Very Poor";
};

// Add this function before your component
const createDropletIcon = (sensor: typeof waterQualitySensors[0]) => {
    const dropletHtml = renderToStaticMarkup(
        <div className={cn(
        "w-8 h-8 flex items-center justify-center rounded-full border-2 shadow-lg bg-white",
        getWQIColor(sensor.wqi)
        )}>
        <Droplets className="w-5 h-5" />
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

const getTrendIcon = (trend: string) => {
    switch (trend) {
    case "improving":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
    case "declining":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
    default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
};

const getLandUseIcon = (type: string) => {
    switch (type) {
    case "industrial":
        return <Factory className="w-4 h-4 text-gray-600" />;
    case "urban":
        return <Home className="w-4 h-4 text-blue-600" />;
    case "agriculture":
        return <TreePine className="w-4 h-4 text-green-600" />;
    default:
        return <MapPin className="w-4 h-4 text-gray-600" />;
    }
};

const formatParameter = (param: string, value: number) => {
    const units: { [key: string]: string } = {
    ph: "",
    turbidity: " NTU",
    temperature: "°C",
    conductivity: " μS/cm",
    dissolvedOxygen: " mg/L",
    bod: " mg/L",
    cod: " mg/L",
    nitrates: " mg/L",
    phosphates: " mg/L",
    ecoli: " CFU/100ml",
    fecalColiform: " CFU/100ml",
    chlorophyllA: " μg/L",
    tss: " mg/L",
    cdom: " m⁻¹",
    wqi: "",
    };
    return `${value}${units[param] || ""}`;
};

useEffect(() => {
    const fetchDocs = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/research-documents', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setResearchDocuments(data);
            }
        } catch (e) {
            console.error('Failed to fetch research documents:', e);
        }
    };
    fetchDocs();
}, []);

return (
    <div className="min-h-screen bg-gray-50">
    <Navigation />

    <div className="flex h-[calc(100vh-64px)]">
        {/* Enhanced Research Controls Sidebar */}
        <div className="w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
            <Link to="/map">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
                </Button>
            </Link>
            <h2 className="text-lg font-semibold text-waterbase-950">
                Water Quality Research
            </h2>
            </div>
            <p className="text-sm text-waterbase-600">
            Comprehensive geotemporal analysis with scientific water quality
            data
            </p>
        </div>

        {/* View Toggle */}
        <div className="p-4 border-b border-gray-200">
            <Tabs
            value={selectedView}
            onValueChange={(value) =>
                setSelectedView(value as "spatial" | "temporal")
            }
            >
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

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
            {selectedView === "spatial" && (
            <div className="p-4 space-y-4">
                {/* Layer Controls */}
                <Card className="border-waterbase-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                    <Layers className="w-4 h-4 mr-2" />
                    Map Layers
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Object.entries(showLayers).map(([key, value]) => (
                    <div
                        key={key}
                        className="flex items-center justify-between"
                    >
                        <div className="flex items-center space-x-2">
                        {key === "sensors" && (
                            <Droplets className="w-4 h-4 text-waterbase-600" />
                        )}
                        {key === "pollution" && (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        {key === "satellite" && (
                            <Leaf className="w-4 h-4 text-green-600" />
                        )}
                        {key === "landuse" && (
                            <Home className="w-4 h-4 text-gray-600" />
                        )}
                        {key === "events" && (
                            <Calendar className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="text-sm text-gray-700 capitalize">
                            {key === "landuse" ? "Land Use" : key}
                        </span>
                        </div>
                        <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                            setShowLayers({ ...showLayers, [key]: checked })
                        }
                        size="sm"
                        />
                    </div>
                    ))}
                </CardContent>
                </Card>

                {/* Water Quality Sensors */}
                {showLayers.sensors && (
                <Card className="border-waterbase-200">
                    <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                        <Microscope className="w-4 h-4 mr-2" />
                        Sensor Stations
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    {waterQualitySensors.map((sensor) => (
                        <div
                        key={sensor.id}
                        className={cn(
                            "p-3 rounded-lg cursor-pointer transition-all hover:shadow-sm border",
                            getWQIColor(sensor.wqi),
                            selectedSensor?.id === sensor.id
                            ? "ring-2 ring-waterbase-500"
                            : "",
                        )}
                        onClick={() => setSelectedSensor(sensor)}
                        >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                            {sensor.name}
                            </span>
                            <div className="flex items-center space-x-1">
                            {getTrendIcon(sensor.trend)}
                            <Badge variant="outline" className="text-xs">
                                {sensor.type}
                            </Badge>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span>WQI: {sensor.wqi}</span>
                            <span className="font-medium">{sensor.status}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                            Updated: {sensor.lastUpdated}
                        </div>
                        <Progress value={sensor.wqi} className="mt-2 h-1" />
                        </div>
                    ))}
                    </CardContent>
                </Card>
                )}

                {/* Land Use Context */}
                {showLayers.landuse && (
                <Card className="border-waterbase-200">
                    <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                        <Home className="w-4 h-4 mr-2" />
                        Land Use Context
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                    {landUseAreas.map((area, index) => (
                        <div
                        key={index}
                        className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                        >
                        <div className="flex items-center space-x-2">
                            {getLandUseIcon(area.type)}
                            <span>{area.name}</span>
                        </div>
                        <Badge
                            variant={
                            area.impact === "high"
                                ? "destructive"
                                : area.impact === "medium"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                        >
                            {area.impact}
                        </Badge>
                        </div>
                    ))}
                    </CardContent>
                </Card>
                )}
            </div>
            )}

            {selectedView === "temporal" && (
            <div className="p-4 space-y-4">
                {/* Time Range Control */}
                <Card className="border-waterbase-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Time Range Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                        Parameter to Analyze
                    </label>
                    <Select
                        value={selectedParameter}
                        onValueChange={setSelectedParameter}
                    >
                        <SelectTrigger className="h-8">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="wqi">
                            Water Quality Index
                        </SelectItem>
                        <SelectItem value="ph">pH Level</SelectItem>
                        <SelectItem value="turbidity">Turbidity</SelectItem>
                        <SelectItem value="dissolvedOxygen">
                            Dissolved Oxygen
                        </SelectItem>
                        <SelectItem value="bod">
                            BOD (Biochemical Oxygen Demand)
                        </SelectItem>
                        <SelectItem value="cod">
                            COD (Chemical Oxygen Demand)
                        </SelectItem>
                        <SelectItem value="nitrates">Nitrates</SelectItem>
                        <SelectItem value="ecoli">E. Coli Count</SelectItem>
                        <SelectItem value="chlorophyllA">
                            Chlorophyll-a
                        </SelectItem>
                        </SelectContent>
                    </Select>
                    </div>

                    <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                        Year Range: {timeRange[0]} - {timeRange[1]}
                    </label>
                    <Slider
                        value={timeRange}
                        onValueChange={setTimeRange}
                        max={2024}
                        min={2020}
                        step={1}
                        className="w-full"
                    />
                    </div>
                </CardContent>
                </Card>

                {/* Time Series Data */}
                <Card className="border-waterbase-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {selectedParameter.toUpperCase()} Trends
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                    {timeSeriesData.map((dataPoint, index) => (
                        <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-waterbase-50 rounded"
                        >
                        <span className="text-xs text-gray-600">
                            {dataPoint.date}
                        </span>
                        <span className="text-sm font-medium">
                            {formatParameter(
                            selectedParameter,
                            dataPoint[
                                selectedParameter as keyof typeof dataPoint
                            ] as number,
                            )}
                        </span>
                        </div>
                    ))}
                    </div>
                </CardContent>
                </Card>

                {/* Environmental Events */}
                <Card className="border-waterbase-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Environmental Events
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {environmentalEvents.map((event, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                            {event.title}
                        </span>
                        <Badge
                            variant={
                            event.impact === "positive"
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs"
                        >
                            {event.impact}
                        </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                        {event.description}
                        </p>
                        <span className="text-xs text-gray-500">
                        {event.date}
                        </span>
                    </div>
                    ))}
                </CardContent>
                </Card>
            </div>
            )}

            {/* Export Controls */}
            <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-waterbase-950 mb-3">
                Export Scientific Data
            </h3>
            <div className="space-y-2">
                <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                >
                <Download className="w-4 h-4 mr-2" />
                Export Water Quality Report
                </Button>
                <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Raw Data (CSV)
                </Button>
                <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                >
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Research Summary
                </Button>
            </div>
            </div>

            {researchDocuments.length > 0 && (
            <div className="p-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-waterbase-950 mb-3">
                Uploaded Research Documents
                </h3>
                <div className="space-y-2">
                {researchDocuments.map((doc) => (
                    <div key={doc.id} className="p-2 bg-gray-50 rounded text-xs">
                    <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-waterbase-600 hover:text-waterbase-800 font-medium block"
                    >
                        {doc.title}
                    </a>
                    {doc.description && (
                        <p className="text-gray-500 mt-1">{doc.description}</p>
                    )}
                    {doc.user && (
                        <p className="text-gray-400 mt-1">Uploaded by {doc.user.firstName} {doc.user.lastName}</p>
                    )}
                    </div>
                ))}
                </div>
            </div>
            )}
        </div>
        </div>

        {/* Enhanced Scientific Map Display */}
        <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-green-50">
        <div className="absolute inset-0">
            {/* Multi-layer scientific visualization */}
            <div className="w-full h-full relative overflow-hidden">
            {/* Satellite imagery simulation */}
            {showLayers.satellite && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-200 via-blue-200 to-green-300 opacity-40" />
            )}
            
            <MapContainer 
                center={[14.4793, 120.9106]} 
                zoom={10} 
                className="w-full h-full"
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Move the markers INSIDE the MapContainer */}
                {showLayers.sensors && waterQualitySensors.map((sensor) => (
                    <Marker 
                        key={sensor.id}
                        position={[sensor.coordinates.lat, sensor.coordinates.lng]}
                        icon={createDropletIcon(sensor)}
                        eventHandlers={{
                            click: () => setSelectedSensor(sensor),
                        }}
                    >
                        <Popup>
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <Droplets className="w-4 h-4 mr-1 text-waterbase-600" />
                                    <span className="font-semibold">{sensor.name}</span>
                                </div>
                                <div className={cn("p-2 rounded", getWQIColor(sensor.wqi))}>
                                    <div className="text-lg font-bold">WQI: {sensor.wqi}</div>
                                    <div className="text-sm">{sensor.status}</div>
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                    <div>pH: {sensor.physicochemical.ph}</div>
                                    <div>Temp: {sensor.physicochemical.temperature}°C</div>
                                    <div>DO: {sensor.physicochemical.dissolvedOxygen} mg/L</div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Land use overlays */}
            {showLayers.landuse &&
                landUseAreas.map((area, index) => (
                <div
                    key={index}
                    className={cn(
                    "absolute w-20 h-20 rounded-lg border-2 opacity-60",
                    area.impact === "high"
                        ? "bg-red-200 border-red-400"
                        : area.impact === "medium"
                        ? "bg-yellow-200 border-yellow-400"
                        : "bg-green-200 border-green-400",
                    )}
                    style={{
                    left: `${40 + index * 15}%`,
                    top: `${60 + index * 10}%`,
                    }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                    {getLandUseIcon(area.type)}
                    </div>
                </div>
                ))}
            </div>
        </div>

        {/* Selected sensor detailed analysis */}
        {selectedSensor && (
            <div className="absolute top-4 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[80vh] overflow-y-auto" style={{ zIndex: 1000 }}>
            <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-waterbase-950">
                    Detailed Water Quality Analysis
                </h3>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedSensor(null)}
                    className="h-6 w-6"
                >
                    <Eye className="w-4 h-4" />
                </Button>
                </div>

                <div className="space-y-4">
                {/* Station Info */}
                <div>
                    <h4 className="font-medium text-sm text-waterbase-950 mb-1">
                    {selectedSensor.name}
                    </h4>
                    <p className="text-xs text-gray-600">
                    Coordinates: {selectedSensor.coordinates.lat},{" "}
                    {selectedSensor.coordinates.lng}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                        {selectedSensor.type}
                    </Badge>
                    {getTrendIcon(selectedSensor.trend)}
                    <span className="text-xs">{selectedSensor.trend}</span>
                    </div>
                </div>

                {/* WQI Score */}
                <div
                    className={cn(
                    "p-3 rounded-lg",
                    getWQIColor(selectedSensor.wqi),
                    )}
                >
                    <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                        Water Quality Index
                    </span>
                    <Gauge className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold">
                    {selectedSensor.wqi}
                    </div>
                    <div className="text-sm">
                    {getWQIStatus(selectedSensor.wqi)}
                    </div>
                    <Progress value={selectedSensor.wqi} className="mt-2 h-2" />
                </div>

                {/* Physico-Chemical Parameters */}
                <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Thermometer className="w-4 h-4 mr-1" />
                    Physico-Chemical
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">pH:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.physicochemical.ph}
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Turbidity:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.physicochemical.turbidity} NTU
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Temperature:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.physicochemical.temperature}°C
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Dissolved O₂:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.physicochemical.dissolvedOxygen} mg/L
                        </span>
                    </div>
                    </div>
                </div>

                {/* Organics & Nutrients */}
                <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Leaf className="w-4 h-4 mr-1" />
                    Organics & Nutrients
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">BOD:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.organics.bod} mg/L
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">COD:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.organics.cod} mg/L
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Nitrates:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.organics.nitrates} mg/L
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Phosphates:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.organics.phosphates} mg/L
                        </span>
                    </div>
                    </div>
                </div>

                {/* Microbial Contamination */}
                <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Microscope className="w-4 h-4 mr-1" />
                    Microbial Contamination
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">E. Coli:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.microbial.ecoli} CFU/100ml
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Fecal Coliform:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.microbial.fecalColiform} CFU/100ml
                        </span>
                    </div>
                    </div>
                </div>

                {/* Optical Indicators */}
                <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    Optical Indicators
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Chlorophyll-a:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.optical.chlorophyllA} μg/L
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">TSS:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.optical.tss} mg/L
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">CDOM:</span>
                        <br />
                        <span className="font-medium">
                        {selectedSensor.optical.cdom} m⁻¹
                        </span>
                    </div>
                    </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-600 mb-2">
                    Last Updated: {selectedSensor.lastUpdated}
                    </div>
                    <Button
                    size="sm"
                    className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                    >
                    Download Station Report
                    </Button>
                </div>
                </div>
            </div>
            </div>
        )}
        </div>
    </div>
    </div>
);
};