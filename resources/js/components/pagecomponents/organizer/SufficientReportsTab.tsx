import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    onRefresh
}: {
    eligibleAreas: any[];
    onCreateEvent: () => void;
    onSelectArea: (area: any) => void;
    onRefresh: () => void;
}) => {
    const { token, user } = useAuth();
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [selectedArea, setSelectedArea] = useState<AreaReport | null>(null);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [showAreaDetails, setShowAreaDetails] = useState(false);
    const [eventError, setEventError] = useState("");
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

            console.log('Sending event data:', eventData); // Debug log

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
                
                // Reset form and close dialog
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

    const handleViewAreaDetails = (area: AreaReport) => {
        setSelectedArea(area);
        setShowAreaDetails(true);
    };

    return (
                <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-waterbase-950">
                    Areas with Sufficient Reports
                    </h2>
                    <Badge className="bg-waterbase-500 text-white">
                    {eligibleAreas.length} locations eligible
                    </Badge>
                </div>

                {eligibleAreas.length === 0 ? (
                    <Card className="border-waterbase-200">
                    <CardContent className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Eligible Areas Yet
                        </h3>
                        <p className="text-gray-600">
                        Areas need at least 3 verified reports to be eligible for cleanup events.
                        </p>
                    </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {eligibleAreas.map((area) => (
                        <Card
                        key={area.id}
                        className="border-waterbase-200 hover:shadow-lg transition-shadow"
                        >
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
                            <Badge
                                className={cn(
                                "text-xs",
                                getSeverityColor(area.severityLevel),
                                )}
                            >
                                {area.severityLevel}
                            </Badge>
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
                            <Dialog
                                open={showCreateEvent && selectedArea?.id === area.id}
                                onOpenChange={setShowCreateEvent}
                            >
                                <DialogTrigger asChild>
                                <Button
                                    className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                                    onClick={() => setSelectedArea(area)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Cleanup Event
                                </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Create Cleanup Event</DialogTitle>
                                    <DialogDescription>
                                    Organize a cleanup event for {selectedArea?.location}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    {/* Error Alert */}
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
                                        placeholder="e.g., Manila Bay Restoration Drive"
                                        value={newEvent.title}
                                        onChange={(e) =>
                                        setNewEvent({
                                            ...newEvent,
                                            title: e.target.value,
                                        })
                                        }
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
                                        placeholder="50"
                                        min="1"
                                        value={newEvent.maxVolunteers}
                                        onChange={(e) =>
                                            setNewEvent({
                                            ...newEvent,
                                            maxVolunteers: e.target.value,
                                            })
                                        }
                                        disabled={isCreatingEvent}
                                        />
                                    </div>
                                    </div>

                                    <div>
                                    <Label htmlFor="description">Event Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the cleanup objectives, what volunteers should bring, meeting point, etc."
                                        value={newEvent.description}
                                        onChange={(e) =>
                                        setNewEvent({
                                            ...newEvent,
                                            description: e.target.value,
                                        })
                                        }
                                        rows={3}
                                        disabled={isCreatingEvent}
                                    />
                                    </div>

                                    {/* Rewards Section - Updated */}
                                    <div className="space-y-4 border-t pt-4">
                                    <h4 className="font-semibold text-waterbase-950 flex items-center">
                                        <Gift className="w-4 h-4 mr-2" />
                                        Volunteer Rewards
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                        <Label htmlFor="rewardPoints">Points</Label>
                                        <Input
                                            id="rewardPoints"
                                            type="number"
                                            placeholder="50"
                                            min="0"
                                            value={newEvent.rewardPoints}
                                            onChange={(e) =>
                                            setNewEvent({
                                                ...newEvent,
                                                rewardPoints: e.target.value,
                                            })
                                            }
                                            disabled={isCreatingEvent}
                                        />
                                        </div>
                                        <div>
                                        <Label htmlFor="rewardBadge">Badge Title</Label>
                                        <Input
                                            id="rewardBadge"
                                            placeholder="e.g., Environmental Champion, River Guardian"
                                            value={newEvent.rewardBadge}
                                            onChange={(e) =>
                                            setNewEvent({
                                                ...newEvent,
                                                rewardBadge: e.target.value,
                                            })
                                            }
                                            disabled={isCreatingEvent}
                                        />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="rewardAdditional">Additional Rewards</Label>
                                        <Input
                                        id="rewardAdditional"
                                        placeholder="e.g., Meal provided, Transportation allowance, T-shirt"
                                        value={newEvent.rewardAdditional}
                                        onChange={(e) =>
                                            setNewEvent({
                                            ...newEvent,
                                            rewardAdditional: e.target.value,
                                            })
                                        }
                                        disabled={isCreatingEvent}
                                        />
                                    </div>
                                    </div>

                                    <div className="flex space-x-2 pt-4">
                                    <Button
                                        onClick={handleCreateEvent}
                                        disabled={isCreatingEvent}
                                        className="flex-1 bg-waterbase-500 hover:bg-waterbase-600"
                                    >
                                        {isCreatingEvent ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Creating Event...
                                        </>
                                        ) : (
                                        'Create Event'
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                        setShowCreateEvent(false);
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

                            {/* Area Details Dialog */}
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => onSelectArea(area)} // Use the prop instead of local function
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details ({area.reports.length} reports)
                            </Button>
                            </div>
                        </CardContent>
                        </Card>
                    ))}
                    </div>
                )}
                </div>
    )
}