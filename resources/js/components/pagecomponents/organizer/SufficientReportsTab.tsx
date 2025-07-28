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
}

export const SufficientReportsTab = ({ 
    eligibleAreas, 
    onCreateEvent, 
    onSelectArea ,
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

    const hasExistingEvent = (area: AreaReport) => {
        if (!createdEvents || createdEvents.length === 0) return false;
        
        return createdEvents.some(event => {
            // Check if event location matches area location (flexible matching)
            const eventLocation = event.address?.toLowerCase() || '';
            const areaLocation = area.location?.toLowerCase() || '';
            
            // Also check coordinates proximity (within ~100m)
            const latDiff = Math.abs(event.latitude - area.coordinates.lat);
            const lngDiff = Math.abs(event.longitude - area.coordinates.lng);
            const isNearby = latDiff < 0.001 && lngDiff < 0.001; // ~100m tolerance
            
            return areaLocation.includes(eventLocation) || 
                eventLocation.includes(areaLocation) || 
                isNearby;
        });
    };

    const filteredAreas = useMemo(() => {
        let areas = eligibleAreas;
        
        // First filter out areas that already have events
        areas = areas.filter(area => !hasExistingEvent(area));
        
        // Then apply urgent filter if enabled
        if (showUrgentOnly) {
            areas = areas.filter(area => 
                area.severityLevel.toLowerCase() === 'high' || 
                area.severityLevel.toLowerCase() === 'critical'
            );
        }
        
        return areas;
    }, [eligibleAreas, showUrgentOnly, createdEvents]);

    // Add statistics for areas with events
    const areasWithEvents = useMemo(() => {
        return eligibleAreas.filter(area => hasExistingEvent(area));
    }, [eligibleAreas, createdEvents]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold text-waterbase-950">
                        Areas with Sufficient Reports
                    </h2>
                    <Badge className="bg-waterbase-500 text-white">
                        {filteredAreas.length} locations {showUrgentOnly ? 'urgent' : 'eligible'}
                    </Badge>
                </div>
                
                {/* Toggle Switch */}
                <div className="flex items-center space-x-3">
                    <Label htmlFor="urgent-toggle" className="text-sm text-gray-600">
                        Show urgent only:
                    </Label>
                    <Switch
                        id="urgent-toggle"
                        checked={showUrgentOnly}
                        onCheckedChange={setShowUrgentOnly}
                        className="data-[state=checked]:bg-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        {showUrgentOnly ? "Urgent" : "All"}
                    </span>
                </div>
            </div>

            {/* Areas with Events Info */}
            {areasWithEvents.length > 0 && (
                <Alert className="border-green-200 bg-green-50">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        <strong>{areasWithEvents.length}</strong> area{areasWithEvents.length > 1 ? 's' : ''} already {areasWithEvents.length > 1 ? 'have' : 'has'} cleanup events scheduled and {areasWithEvents.length > 1 ? 'are' : 'is'} hidden from this list.
                        Check the "My Events" tab to manage existing events.
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
                            {areasWithEvents.length > 0 && eligibleAreas.length > 0
                                ? "All Areas Have Events"
                                : showUrgentOnly 
                                    ? "No Urgent Areas" 
                                    : "No Eligible Areas Yet"
                            }
                        </h3>
                        <p className="text-gray-600">
                            {areasWithEvents.length > 0 && eligibleAreas.length > 0
                                ? `Great! All ${eligibleAreas.length} eligible areas already have cleanup events scheduled. Check the "My Events" tab to manage them.`
                                : showUrgentOnly 
                                    ? "No areas with high or critical severity levels found. Toggle to show all areas." 
                                    : "Areas need at least 3 verified reports to be eligible for cleanup events."
                            }
                        </p>
                        {showUrgentOnly && filteredAreas.length === 0 && areasWithEvents.length === 0 && (
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
                    {filteredAreas.map((area) => (
                        <Card key={area.id} className={cn(
                            "border-waterbase-200 hover:shadow-lg transition-shadow",
                            (area.severityLevel.toLowerCase() === 'critical' || 
                                area.severityLevel.toLowerCase() === 'high') && 
                            showUrgentOnly && "ring-2 ring-red-200"
                        )}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg text-waterbase-950">
                                            {area.location}
                                        </CardTitle>
                                        <CardDescription className="mt-2">
                                            {area.description}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1">
                                        <Badge
                                            className={cn(
                                                "text-xs",
                                                getSeverityColor(area.severityLevel),
                                            )}
                                        >
                                            {area.severityLevel}
                                        </Badge>
                                        {(area.severityLevel.toLowerCase() === 'critical' || 
                                            area.severityLevel.toLowerCase() === 'high') && (
                                            <Badge variant="destructive" className="text-xs">
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
                                    {/* Create Event Button with Complete Dialog */}
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

                                        {/* Complete Dialog Content */}
                                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Create Cleanup Event</DialogTitle>
                                                <DialogDescription>
                                                    Create a new cleanup event for {selectedArea?.location}
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4">
                                                {eventError && (
                                                    <Alert variant="destructive">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>{eventError}</AlertDescription>
                                                    </Alert>
                                                )}

                                                <div>
                                                    <Label htmlFor="title">Event Title *</Label>
                                                    <Input
                                                        id="title"
                                                        value={newEvent.title}
                                                        onChange={(e) =>
                                                            setNewEvent({
                                                                ...newEvent,
                                                                title: e.target.value,
                                                            })
                                                        }
                                                        placeholder="e.g., Manila Bay Cleanup Drive"
                                                        disabled={isCreatingEvent}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="date">Date *</Label>
                                                        <Input
                                                            id="date"
                                                            type="date"
                                                            value={newEvent.date}
                                                            min={new Date().toISOString().split('T')[0]}
                                                            onChange={(e) =>
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    date: e.target.value,
                                                                })
                                                            }
                                                            disabled={isCreatingEvent}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="time">Time *</Label>
                                                        <Input
                                                            id="time"
                                                            type="time"
                                                            value={newEvent.time}
                                                            onChange={(e) =>
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    time: e.target.value,
                                                                })
                                                            }
                                                            disabled={isCreatingEvent}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="duration">Duration</Label>
                                                        <Select
                                                            value={newEvent.duration}
                                                            onValueChange={(value) =>
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    duration: value,
                                                                })
                                                            }
                                                            disabled={isCreatingEvent}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select duration" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="2">2 hours</SelectItem>
                                                                <SelectItem value="3">3 hours</SelectItem>
                                                                <SelectItem value="4">4 hours</SelectItem>
                                                                <SelectItem value="6">Half day</SelectItem>
                                                                <SelectItem value="12">Full day</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="maxVolunteers">Max Volunteers *</Label>
                                                        <Input
                                                            id="maxVolunteers"
                                                            type="number"
                                                            min="1"
                                                            value={newEvent.maxVolunteers}
                                                            onChange={(e) =>
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    maxVolunteers: e.target.value,
                                                                })
                                                            }
                                                            placeholder="e.g., 20"
                                                            disabled={isCreatingEvent}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label htmlFor="description">Event Description</Label>
                                                    <Textarea
                                                        id="description"
                                                        value={newEvent.description}
                                                        onChange={(e) =>
                                                            setNewEvent({
                                                                ...newEvent,
                                                                description: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Describe the cleanup event..."
                                                        rows={3}
                                                        disabled={isCreatingEvent}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="rewardPoints">Points Reward</Label>
                                                        <Input
                                                            id="rewardPoints"
                                                            type="number"
                                                            min="0"
                                                            value={newEvent.rewardPoints}
                                                            onChange={(e) =>
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    rewardPoints: e.target.value,
                                                                })
                                                            }
                                                            placeholder="50"
                                                            disabled={isCreatingEvent}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="rewardBadge">Badge Title</Label>
                                                        <Input
                                                            id="rewardBadge"
                                                            value={newEvent.rewardBadge}
                                                            onChange={(e) =>
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    rewardBadge: e.target.value,
                                                                })
                                                            }
                                                            placeholder="Environmental Volunteer"
                                                            disabled={isCreatingEvent}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex space-x-2 pt-4">
                                                    <Button
                                                        onClick={handleCreateEvent}
                                                        className="flex-1 bg-waterbase-500 hover:bg-waterbase-600"
                                                        disabled={isCreatingEvent}
                                                    >
                                                        {isCreatingEvent ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Creating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Create Event
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowCreateEvent(false);
                                                            setSelectedArea(null);
                                                            setEventError("");
                                                        }}
                                                        className="flex-1"
                                                        disabled={isCreatingEvent}
                                                    >
                                                        Cancel
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
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details ({area.reports?.length || 0} reports)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Summary Stats */}
            {eligibleAreas.length > 0 && (
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                            <span>Total eligible: {eligibleAreas.length}</span>
                            <span>Available: {filteredAreas.length}</span>
                            {areasWithEvents.length > 0 && (
                                <span className="text-green-600">
                                    With events: {areasWithEvents.length}
                                </span>
                            )}
                            <span className="text-red-600">
                                Urgent available: {filteredAreas.filter(area => 
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
                                View all {filteredAreas.length} available areas
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}