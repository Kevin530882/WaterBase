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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface AreaReport {
    id: number;
    location: string;
    coordinates: { lat: number; lng: number };
    reportCount: number;
    severityLevel: string;
    lastReported: string;
    description: string;
    estimatedCleanupEffort: string;
    priority: string;
    reports: Report[];
    hasAssociatedEvent: boolean;
}

export const SufficientReportsTab = ({
    eligibleAreas,
    onCreateEvent,
    onSelectArea,
    onRefresh,
    createdEvents = []
}: {
    eligibleAreas: any[];
    onCreateEvent: () => void;
    onSelectArea: (area: any) => void;
    onRefresh: () => void;
    createdEvents?: any[];
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
            case "medium":
                return "bg-yellow-500 text-black";
            case "low":
                return "bg-green-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    const handleCreateEvent = async () => {
        if (!selectedArea) return;

        // Validate form
        if (!newEvent.title.trim()) {
            setEventError("Event title is required");
            return;
        }
        if (!newEvent.date || !newEvent.time) {
            setEventError("Date and time are required");
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
                description: newEvent.description || `Cleanup event for ${selectedArea.location}`,
                maxVolunteers: parseInt(newEvent.maxVolunteers),
                points: parseInt(newEvent.rewardPoints) || 50,
                badge: newEvent.rewardBadge || "Environmental Volunteer",
                status: 'recruiting',
                user_id: user.id,
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

                // Use the prop instead of fetchCreatedEvents
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

    const areLocationsMatching = (
        coord1: { lat: number; lng: number },
        coord2: { lat: number; lng: number }
    ): boolean => {
        // Same exact coordinates
        if (coord1.lat === coord2.lat && coord1.lng === coord2.lng) {
            return true;
        }

        // Very close proximity (50m tolerance)
        const latDiff = Math.abs(coord1.lat - coord2.lat);
        const lngDiff = Math.abs(coord1.lng - coord2.lng);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        return distance <= 0.0005; // 1m threshold
    };

    // Then replace hasExistingEvent with:
    const hasExistingEvent = (area: AreaReport) => {
        if (!createdEvents || createdEvents.length === 0) return false;

        return createdEvents.some(event => {
            const eventCoords = { lat: event.latitude, lng: event.longitude };
            const areaCoords = area.coordinates;

            const isMatch = areLocationsMatching(eventCoords, areaCoords);

            console.log(`Event ${event.id} vs Area ${area.id}:`, {
                eventCoords,
                areaCoords,
                isMatch
            });

            return isMatch;
        });
    };

    const filteredAreas = useMemo(() => {
        let areas = eligibleAreas;

        // Don't filter out areas with events - show them all
        // Just apply urgent filter if enabled
        if (showUrgentOnly) {
            areas = areas.filter(area =>
                area.severityLevel.toLowerCase() === 'high' ||
                area.severityLevel.toLowerCase() === 'critical'
            );
        }

        return areas;
    }, [eligibleAreas, showUrgentOnly]);

    // Add statistics for areas with events
    const areasWithEvents = useMemo(() => {
        return eligibleAreas.filter(area => area.hasAssociatedEvent);
    }, [eligibleAreas]);

    const areasWithoutEvents = useMemo(() => {
        return eligibleAreas.filter(area => !area.hasAssociatedEvent);
    }, [eligibleAreas]);

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

            {/* Areas with Events Info */}
            {areasWithEvents.length > 0 && (
                <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                        <strong>{areasWithEvents.length}</strong> area{areasWithEvents.length > 1 ? 's' : ''} already {areasWithEvents.length > 1 ? 'have' : 'has'} cleanup events scheduled.
                        You can manage existing events in the "My Events" tab.
                    </AlertDescription>
                </Alert>
            )}

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
                        const hasEvent = area.hasAssociatedEvent;

                        return (
                            <Card key={area.id} className={cn(
                                "border-waterbase-200 hover:shadow-lg transition-shadow",
                                hasEvent && "ring-2 ring-green-200 bg-green-50/50",
                                (area.severityLevel.toLowerCase() === 'critical' ||
                                    area.severityLevel.toLowerCase() === 'high') &&
                                showUrgentOnly && "ring-2 ring-red-200"
                            )}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
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
                                            {hasEvent && (
                                                <Badge className="bg-green-500 text-white text-xs px-2 py-1 h-auto">
                                                    Event Scheduled
                                                </Badge>
                                            )}
                                            {(area.severityLevel.toLowerCase() === 'critical' ||
                                                area.severityLevel.toLowerCase() === 'high') && (
                                                    <Badge variant="destructive" className="text-xs px-2 py-1 h-auto">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Urgent
                                                    </Badge>
                                                )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
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

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        {/* Create Event Button - Different states based on existing event */}
                                        {hasEvent ? (
                                            <Button
                                                className="w-full bg-gray-400 cursor-not-allowed"
                                                disabled={true}
                                            >
                                                <Calendar className="w-4 h-4 mr-2" />
                                                Event Already Scheduled
                                            </Button>
                                        ) : (
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
                                                            (area.severityLevel.toLowerCase() === 'critical' ||
                                                                area.severityLevel.toLowerCase() === 'high')
                                                                ? "bg-red-500 hover:bg-red-600 text-white"
                                                                : "bg-waterbase-500 hover:bg-waterbase-600"
                                                        )}
                                                        onClick={() => {
                                                            setSelectedArea(area);
                                                            setShowCreateEvent(true);
                                                        }}
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        {(area.severityLevel.toLowerCase() === 'critical' ||
                                                            area.severityLevel.toLowerCase() === 'high')
                                                            ? "Create Urgent Event"
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

                                                    {eventError && (
                                                        <Alert variant="destructive">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <AlertDescription>{eventError}</AlertDescription>
                                                        </Alert>
                                                    )}

                                                    <div className="space-y-2">
                                                        {/* Event Title */}
                                                        <div>
                                                            <Label htmlFor="title">Event Title *</Label>
                                                            <Input
                                                                id="title"
                                                                placeholder="e.g., Beach Cleanup at Manila Bay"
                                                                value={newEvent.title}
                                                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                                            />
                                                        </div>

                                                        {/* Date and Time */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="date">Date *</Label>
                                                                <Input
                                                                    id="date"
                                                                    type="date"
                                                                    value={newEvent.date}
                                                                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="time">Time *</Label>
                                                                <Input
                                                                    id="time"
                                                                    type="time"
                                                                    value={newEvent.time}
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
                                        )}

                                        {/* View Details Button */}
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => onSelectArea(area)}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Details ({area.reports?.length || 0} reports)
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Updated Summary Stats */}
            {eligibleAreas.length > 0 && (
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                            <span>Total areas: {eligibleAreas.length}</span>
                            <span>Available for events: {areasWithoutEvents.length}</span>
                            <span className="text-green-600">With events: {areasWithEvents.length}</span>
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
    )
}