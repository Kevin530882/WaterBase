import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Plus,
    Calendar,
    Gift,
    Eye,
    FileText,
    Loader2,
    AlertCircle,
    AlertTriangle,
    Filter,
    Zap,
    RadioTower,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface AreaReport {
    id: number;
    source?: 'report' | 'sensor';
    location: string;
    coordinates: { lat: number; lng: number };
    reportCount: number;
    severityLevel: string;
    lastReported: string;
    description: string;
    estimatedCleanupEffort: string;
    priority: string;
    reports: Report[];
    sensor?: SensorEventRecommendation;
}

interface Report {
    id: number;
}

interface SensorEventRecommendation {
    source: 'sensor';
    device_id: number;
    station_id: string | null;
    name: string | null;
    latitude: number;
    longitude: number;
    wbsi_score: number;
    severity_label: string;
    latest_telemetry: {
        recorded_at?: string | null;
        ph?: number | null;
        turbidity_ntu?: number | null;
        tds_mg_l?: number | null;
        temperature_celsius?: number | null;
    } | null;
    last_seen_at: string | null;
}

// Event creation presets for faster event setup
const EVENT_PRESETS = {
    quick: {
        name: "Quick Cleanup (2 hours)",
        duration: "2",
        maxVolunteers: "15",
        rewardPoints: "30",
        rewardBadge: "Water Defender",
    },
    halfDay: {
        name: "Half-day Event (4 hours)",
        duration: "4",
        maxVolunteers: "25",
        rewardPoints: "60",
        rewardBadge: "Environmental Steward",
    },
    fullDay: {
        name: "Full-day Intensive (8 hours)",
        duration: "8",
        maxVolunteers: "40",
        rewardPoints: "100",
        rewardBadge: "Cleanup Champion",
    },
};

const getTodayDateInput = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getCurrentTimeInput = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
};

const isPastEventTime = (date: string, time: string) => {
    if (!date || !time) return false;

    return new Date(`${date}T${time}`) <= new Date();
};

export const SufficientReportsTab = ({
    eligibleAreas,
    sensorRecommendation,
    isLoading = false,
    onSelectArea,
    onRefresh,
}: {
    eligibleAreas: any[];
    sensorRecommendation?: AreaReport | null;
    isLoading?: boolean;
    onSelectArea: (area: any) => void;
    onRefresh: () => void;
}) => {
    const { token, user } = useAuth();
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [selectedArea, setSelectedArea] = useState<AreaReport | null>(null);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [eventError, setEventError] = useState("");
    const [showUrgentOnly, setShowUrgentOnly] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: "",
        date: "",
        time: "",
        duration: "",
        maxVolunteers: "",
        description: "",
        rewardPoints: "",
        rewardBadge: "",
        rewardAdditional: "",
    });

    const getSeverityColor = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "critical":
                return "bg-red-500 text-white";
            case "high":
                return "bg-orange-500 text-white";
            case "moderate":
            case "medium":
                return "bg-yellow-500 text-black";
            case "low":
                return "bg-green-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    const applyPreset = (presetKey: keyof typeof EVENT_PRESETS) => {
        const preset = EVENT_PRESETS[presetKey];
        setNewEvent(prev => ({
            ...prev,
            duration: preset.duration,
            maxVolunteers: preset.maxVolunteers,
            rewardPoints: preset.rewardPoints,
            rewardBadge: preset.rewardBadge,
        }));
    };

    const generateDefaultTitleForArea = (area: AreaReport) => {
        if (area.source === 'sensor') {
            return `Sensor Cleanup Assessment: ${area.location}`;
        }

        const severity = area.severityLevel.toLowerCase();
        const isCritical = severity === "critical" || severity === "high";
        const prefix = isCritical ? "Urgent Cleanup:" : "Cleanup Event:";
        return `${prefix} ${area.location}`;
    };

    const generateDefaultTitle = () => {
        if (!selectedArea) return "";
        return generateDefaultTitleForArea(selectedArea);
    };

    const generateDefaultDescription = (area: AreaReport) => {
        if (area.source !== 'sensor' || !area.sensor) {
            return `Cleanup event for ${area.location}`;
        }

        const telemetry = area.sensor.latest_telemetry;
        const readings = [
            telemetry?.ph !== null && telemetry?.ph !== undefined ? `pH ${Number(telemetry.ph).toFixed(2)}` : null,
            telemetry?.turbidity_ntu !== null && telemetry?.turbidity_ntu !== undefined ? `turbidity ${Number(telemetry.turbidity_ntu).toFixed(1)} NTU` : null,
            telemetry?.tds_mg_l !== null && telemetry?.tds_mg_l !== undefined ? `TDS ${Number(telemetry.tds_mg_l).toFixed(0)} mg/L` : null,
            telemetry?.temperature_celsius !== null && telemetry?.temperature_celsius !== undefined ? `temperature ${Number(telemetry.temperature_celsius).toFixed(1)} C` : null,
        ].filter(Boolean).join(', ');

        return `Recommended from sensor station ${area.sensor.station_id || area.location}. Latest WBSI: ${Math.round(area.sensor.wbsi_score)}% (${area.sensor.severity_label}).${readings ? ` Latest readings: ${readings}.` : ''}`;
    };

    const openCreateEvent = (area: AreaReport) => {
        setSelectedArea(area);
        setNewEvent(prev => ({
            ...prev,
            title: generateDefaultTitleForArea(area),
            description: generateDefaultDescription(area),
        }));
        setShowCreateEvent(true);
    };

    const isUrgentArea = (area: AreaReport) => {
        if (area.source === 'sensor') {
            return (area.sensor?.wbsi_score ?? 0) >= 75;
        }

        const severity = area.severityLevel.toLowerCase();
        return severity === "critical" || severity === "high";
    };

    const handleCreateEvent = async () => {
        if (!selectedArea) return;

        if (!newEvent.title.trim()) {
            setEventError("Event title is required");
            return;
        }
        if (!newEvent.date || !newEvent.time) {
            setEventError("Date and time are required");
            return;
        }
        if (isPastEventTime(newEvent.date, newEvent.time)) {
            setEventError("Event time must be later than the current time.");
            return;
        }
        if (!newEvent.maxVolunteers || parseInt(newEvent.maxVolunteers) < 1) {
            setEventError("Maximum volunteers must be at least 1");
            return;
        }

        setIsCreatingEvent(true);
        setEventError("");

        try {
            const eventData = {
                title: newEvent.title,
                address: selectedArea.location,
                latitude: selectedArea.coordinates.lat,
                longitude: selectedArea.coordinates.lng,
                date: newEvent.date,
                time: newEvent.time,
                duration: newEvent.duration,
                description: newEvent.description || generateDefaultDescription(selectedArea),
                maxVolunteers: parseInt(newEvent.maxVolunteers),
                points: parseInt(newEvent.rewardPoints) || 50,
                badge: newEvent.rewardBadge || "Environmental Volunteer",
                status: 'recruiting',
                user_id: user?.id,
            };

            console.log('Sending event data:', eventData);

            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            if (response.ok) {
                const createdEvent = await response.json();
                console.log("Cleanup event created successfully:", createdEvent);

                setNewEvent({
                    title: "",
                    date: "",
                    time: "",
                    duration: "",
                    maxVolunteers: "",
                    description: "",
                    rewardPoints: "",
                    rewardBadge: "",
                    rewardAdditional: "",
                });
                setShowCreateEvent(false);
                setSelectedArea(null);
                onRefresh();

                // Show success message
                alert("Cleanup event created successfully!");

            } else {
                const errorData = await response.json();
                console.error('Event creation error:', errorData);
                throw new Error(errorData.message || 'Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            setEventError(error instanceof Error ? error.message : 'Failed to create event. Please try again.');
        } finally {
            setIsCreatingEvent(false);
        }
    };

    const filteredAreas = useMemo(() => {
        let areas = sensorRecommendation ? [sensorRecommendation, ...eligibleAreas] : eligibleAreas;

        if (showUrgentOnly) {
            areas = areas.filter(area => isUrgentArea(area));
        }

        return areas;
    }, [eligibleAreas, sensorRecommendation, showUrgentOnly]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
                    <p className="text-waterbase-600">Loading accessible reports...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-waterbase-950">
                        Areas with Sufficient Reports
                    </h2>

                </div>

                {/* Toggle Switch */}
                <div className="flex justify-between items-center space-x-2 sm:space-x-3">
                    <Badge className="bg-waterbase-500 text-white text-xs sm:text-sm px-2 py-1 h-auto w-fit">
                        {filteredAreas.length} locations {showUrgentOnly ? 'urgent' : 'eligible'}
                    </Badge>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="urgent-toggle" className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                            Show urgent only:
                        </Label>
                        <Switch
                            id="urgent-toggle"
                            checked={showUrgentOnly}
                            onCheckedChange={setShowUrgentOnly}
                            className="data-[state=checked]:bg-red-500"
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                            {showUrgentOnly ? "Urgent" : "All"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Info */}
            {showUrgentOnly && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                        Showing only areas with <strong>high</strong> or <strong>critical</strong> severity levels that require immediate attention.
                        {filteredAreas.length === 0 && " No urgent areas found."}
                    </AlertDescription>
                </Alert>
            )}

            {filteredAreas.length === 0 ? (
                <Card className="border-waterbase-200">
                    <CardContent className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {showUrgentOnly ? "No Urgent Areas" : "No Eligible Areas Yet"}
                        </h3>
                        <p className="text-gray-600">
                            {showUrgentOnly
                                ? "No areas with high or critical severity levels found. Toggle to show all areas."
                                : "Areas need at least 1 verified report to be eligible for cleanup events."
                            }
                        </p>
                        {showUrgentOnly && (
                            <Button
                                variant="outline"
                                onClick={() => setShowUrgentOnly(false)}
                                className="mt-4"
                            >
                                Show All Areas
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAreas.map((area) => {
                        const isSensor = area.source === 'sensor';
                        const isUrgent = isUrgentArea(area);
                        const telemetry = area.sensor?.latest_telemetry;

                        return (
                            <Card key={area.id} className={cn(
                                "border-waterbase-200 hover:shadow-lg transition-shadow",
                                isSensor && "border-waterbase-400 bg-waterbase-50/40",
                                isUrgent && showUrgentOnly && "ring-2 ring-red-200"
                            )}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {isSensor && (
                                                <Badge variant="outline" className="mb-2 bg-white text-waterbase-700 border-waterbase-300">
                                                    <RadioTower className="w-3 h-3 mr-1" />
                                                    Sensor-driven
                                                </Badge>
                                            )}
                                            <CardTitle className="text-base sm:text-lg text-waterbase-950 break-words">
                                                {area.location}
                                            </CardTitle>
                                            <CardDescription className="mt-2 text-sm">
                                                {area.description}
                                            </CardDescription>
                                        </div>
                                        <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                                            <Badge
                                                className={cn(
                                                    "text-xs px-2 py-1 h-auto",
                                                    getSeverityColor(area.severityLevel),
                                                )}
                                            >
                                                {area.severityLevel}
                                            </Badge>
                                            {isUrgent && (
                                                    <Badge variant="destructive" className="text-xs px-2 py-1 h-auto">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Urgent
                                                    </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    {isSensor ? (
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">WBSI:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {Math.round(area.sensor?.wbsi_score ?? 0)}%
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Station:</span>
                                                <div className="font-semibold text-waterbase-950 break-words">
                                                    {area.sensor?.station_id || `Device ${area.sensor?.device_id}`}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Last Update:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {area.lastReported}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Priority:</span>
                                                <div className="font-semibold capitalize text-waterbase-950">
                                                    {area.priority}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">pH:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {telemetry?.ph !== null && telemetry?.ph !== undefined ? Number(telemetry.ph).toFixed(2) : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Turbidity:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {telemetry?.turbidity_ntu !== null && telemetry?.turbidity_ntu !== undefined ? `${Number(telemetry.turbidity_ntu).toFixed(1)} NTU` : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">TDS:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {telemetry?.tds_mg_l !== null && telemetry?.tds_mg_l !== undefined ? `${Number(telemetry.tds_mg_l).toFixed(0)} mg/L` : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Temp:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {telemetry?.temperature_celsius !== null && telemetry?.temperature_celsius !== undefined ? `${Number(telemetry.temperature_celsius).toFixed(1)} C` : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Reports:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {area.reportCount} verified
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Effort:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {area.estimatedCleanupEffort}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Last Report:</span>
                                                <div className="font-semibold text-waterbase-950">
                                                    {area.lastReported}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Priority:</span>
                                                <div className="font-semibold capitalize text-waterbase-950">
                                                    {area.priority}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        {/* Create Event Button - All areas shown are available for events */}
                                        <Dialog
                                            open={showCreateEvent && selectedArea?.id === area.id}
                                            onOpenChange={(open) => {
                                                setShowCreateEvent(open);
                                                if (!open) {
                                                    setSelectedArea(null);
                                                    setEventError("");
                                                }
                                            }}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    className={cn(
                                                        "w-full",
                                                        isUrgent
                                                            ? "bg-red-500 hover:bg-red-600 text-white"
                                                            : "bg-waterbase-500 hover:bg-waterbase-600"
                                                    )}
                                                    onClick={() => {
                                                        openCreateEvent(area);
                                                    }}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    {isUrgent
                                                        ? "Create Urgent Event"
                                                        : isSensor
                                                            ? "Create Sensor Event"
                                                            : "Create Cleanup Event"
                                                    }
                                                </Button>
                                            </DialogTrigger>

                                            {/* Event Creation Dialog */}
                                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Create Cleanup Event</DialogTitle>
                                                    <DialogDescription>
                                                        Set up a new cleanup event for {selectedArea?.location}
                                                    </DialogDescription>
                                                </DialogHeader>

                                                {/* Event Presets for quick setup */}
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium flex items-center">
                                                        <Zap className="w-4 h-4 mr-2 text-waterbase-500" />
                                                        Quick Templates
                                                    </Label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {Object.entries(EVENT_PRESETS).map(([key, preset]) => (
                                                            <Button
                                                                key={key}
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => applyPreset(key as keyof typeof EVENT_PRESETS)}
                                                                className="text-xs hover:bg-waterbase-50"
                                                            >
                                                                {preset.name.split(' ')[0]}
                                                                <br />
                                                                <span className="text-xs font-normal text-gray-600">
                                                                    {preset.maxVolunteers} volunteers
                                                                </span>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        Click a template to auto-fill duration, volunteer count, and rewards. All fields remain editable.
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    {/* Event Title */}
                                                    <div>
                                                        <Label htmlFor="title">Event Title *</Label>
                                                        <Input
                                                            id="title"
                                                            placeholder={generateDefaultTitle() || "e.g., Beach Cleanup at Manila Bay"}
                                                            value={newEvent.title}
                                                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                                        />
                                                        {!newEvent.title && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Suggested: {generateDefaultTitle()}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Date and Time */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor="date">Date *</Label>
                                                            <Input
                                                                id="date"
                                                                type="date"
                                                                value={newEvent.date}
                                                                min={getTodayDateInput()}
                                                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="time">Time *</Label>
                                                            <Input
                                                                id="time"
                                                                type="time"
                                                                value={newEvent.time}
                                                                min={newEvent.date === getTodayDateInput() ? getCurrentTimeInput() : undefined}
                                                                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Duration and Max Volunteers */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor="duration">Duration (hours)</Label>
                                                            <Select
                                                                value={newEvent.duration}
                                                                onValueChange={(value) => setNewEvent({ ...newEvent, duration: value })}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select duration" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="2">2 hours</SelectItem>
                                                                    <SelectItem value="3">3 hours</SelectItem>
                                                                    <SelectItem value="4">4 hours</SelectItem>
                                                                    <SelectItem value="6">6 hours</SelectItem>
                                                                    <SelectItem value="8">8 hours (Full day)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="maxVolunteers">Max Volunteers *</Label>
                                                            <Input
                                                                id="maxVolunteers"
                                                                type="number"
                                                                min="1"
                                                                placeholder="e.g., 20"
                                                                value={newEvent.maxVolunteers}
                                                                onChange={(e) => setNewEvent({ ...newEvent, maxVolunteers: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    <div>
                                                        <Label htmlFor="description">Description</Label>
                                                        <Textarea
                                                            id="description"
                                                            placeholder="Describe the cleanup activities, what to bring, meeting point, etc."
                                                            value={newEvent.description}
                                                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                                            rows={3}
                                                        />
                                                    </div>

                                                    {/* Rewards Section */}
                                                    <div className="space-y-3">
                                                        <Label className="text-base font-medium flex items-center">
                                                            <Gift className="w-4 h-4 mr-2" />
                                                            Volunteer Rewards
                                                        </Label>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="rewardPoints">Points</Label>
                                                                <Input
                                                                    id="rewardPoints"
                                                                    type="number"
                                                                    placeholder="50"
                                                                    value={newEvent.rewardPoints}
                                                                    onChange={(e) => setNewEvent({ ...newEvent, rewardPoints: e.target.value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="rewardBadge">Badge Name</Label>
                                                                <Input
                                                                    id="rewardBadge"
                                                                    placeholder="Environmental Volunteer"
                                                                    value={newEvent.rewardBadge}
                                                                    onChange={(e) => setNewEvent({ ...newEvent, rewardBadge: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    {eventError && (
                                                        <Alert variant="destructive">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <AlertDescription>{eventError}</AlertDescription>
                                                        </Alert>
                                                    )}

                                                    <div className="flex justify-end space-x-2 pt-4">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setShowCreateEvent(false);
                                                                setSelectedArea(null);
                                                                setEventError("");
                                                            }}
                                                            disabled={isCreatingEvent}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={handleCreateEvent}
                                                            disabled={isCreatingEvent}
                                                            className="bg-waterbase-500 hover:bg-waterbase-600"
                                                        >
                                                            {isCreatingEvent ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                    Creating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Calendar className="w-4 h-4 mr-2" />
                                                                    Create Event
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        {/* View Details Button */}
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => onSelectArea(area)}
                                            disabled={isSensor}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            {isSensor ? "Sensor details shown" : `View Details (${area.reports?.length || 0} reports)`}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Summary Stats */}
            {eligibleAreas.length > 0 && (
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                            <span>Total areas: {eligibleAreas.length}</span>
                            <span>Available for events: {eligibleAreas.length}</span>
                            <span className="text-red-600">
                                Urgent: {filteredAreas.filter(area =>
                                    area.severityLevel.toLowerCase() === 'high' ||
                                    area.severityLevel.toLowerCase() === 'critical'
                                ).length}
                            </span>
                        </div>
                        {showUrgentOnly && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowUrgentOnly(false)}
                                className="text-waterbase-600 hover:text-waterbase-800"
                            >
                                <Filter className="w-4 h-4 mr-1" />
                                View all areas
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
