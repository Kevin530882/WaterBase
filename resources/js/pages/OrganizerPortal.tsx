import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import {
    Calendar,
    MapPin,
    Users,
    Plus,
    Award,
    AlertTriangle,
    CheckCircle,
    Clock,
    Target,
    Gift,
    Camera,
    Edit,
    Trash2,
    MessageSquare,
    Image,
    Eye,
    FileText,
    Loader2,
    AlertCircle,
    RefreshCw,
    Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Report {
    id: number;
    title: string;
    content: string;
    address: string;
    latitude: number;
    longitude: number;
    pollutionType: string;
    severityByUser: string;
    status: string;
    image: string;
    user_id: number;
    created_at: string;
    updated_at: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

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

interface CleanupEvent {
    id: number;
    title: string;
    location: string;
    date: string;
    time: string;
    duration: string;
    maxVolunteers: number;
    description: string;
    rewardPoints: number;
    rewardBadge: string;
    rewardAdditional: string;
    areaId: number;
    organizerId: number;
    status: 'recruiting' | 'active' | 'completed' | 'cancelled';
    currentVolunteers: number;
}

export const OrganizerPortal = () => {
    const { token, user } = useAuth();
    // All state declarations first
    const [activeTab, setActiveTab] = useState("areas");
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [selectedArea, setSelectedArea] = useState<AreaReport | null>(null);
    const [showImageDialog, setShowImageDialog] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [eligibleAreas, setEligibleAreas] = useState<AreaReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [eventError, setEventError] = useState("");
    const [showAreaDetails, setShowAreaDetails] = useState(false);
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);
    const [createdEvents, setCreatedEvents] = useState<any[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [showEditEvent, setShowEditEvent] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [editEventData, setEditEventData] = useState({
        title: "",
        date: "",
        time: "",
        duration: "",
        maxVolunteers: "",
        description: "",
        rewardPoints: "",
        rewardBadge: "",
        status: "",
    });
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

    const fetchCreatedEvents = async () => {
        if (!user?.id) return;
        
        try {
            setIsLoadingEvents(true);
            
            const response = await fetch(`/api/events?user_id=${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCreatedEvents(data);
            } else {
                console.error('Failed to fetch events');
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setIsLoadingEvents(false);
        }
    };

    const fetchReports = async () => {
        try {
        setIsLoading(true);
        setError("");

        const response = await fetch('/api/reports', {
            headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            setReports(data);
            processEligibleAreas(data);
        } else {
            throw new Error('Failed to fetch reports');
        }
        } catch (error) {
        console.error('Error fetching reports:', error);
        setError('Failed to load reports. Please try again.');
        } finally {
        setIsLoading(false);
        }
    };

    const isEventActive = (event: any): boolean => {
        const now = new Date();
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        const eventEndTime = new Date(eventDateTime.getTime() + (parseFloat(event.duration) * 60 * 60 * 1000));
        
        return now >= eventDateTime && now <= eventEndTime;
    };

    useEffect(() => {
        // Initial data fetch
        fetchReports();
        
        // Fetch events if user is available
        if (user?.id) {
            fetchCreatedEvents();
        }
    }, [user?.id, token]);

    // Process reports into areas with sufficient report counts
    const processEligibleAreas = (allReports: Report[]) => {
        // Group reports by coordinates (latitude and longitude)
        // Using a tolerance of ~0.01 degrees (approximately 1km) to group nearby reports
        const COORDINATE_TOLERANCE = 0.01;
        const locationGroups: { [key: string]: Report[] } = {};
        
        allReports.forEach(report => {
            // Validate coordinates before processing
            const lat = parseFloat(report.latitude?.toString() || '0');
            const lng = parseFloat(report.longitude?.toString() || '0');
            
            // Skip reports with invalid coordinates
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                console.warn('Skipping report with invalid coordinates:', report.id, { lat: report.latitude, lng: report.longitude });
                return;
            }
            
            // Round coordinates to create location groups within tolerance
            const roundedLat = Math.round(lat / COORDINATE_TOLERANCE) * COORDINATE_TOLERANCE;
            const roundedLng = Math.round(lng / COORDINATE_TOLERANCE) * COORDINATE_TOLERANCE;
            const locationKey = `${roundedLat.toFixed(3)},${roundedLng.toFixed(3)}`;
            
            if (!locationGroups[locationKey]) {
                locationGroups[locationKey] = [];
            }
            locationGroups[locationKey].push(report);
        });

        // Convert to eligible areas (minimum 3 reports per area)
        const areas: AreaReport[] = Object.entries(locationGroups)
            .filter(([_, reports]) => reports.length >= 3)
            .map(([locationKey, areaReports], index) => {
                const latestReport = areaReports.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                // Calculate average coordinates for the area center with validation
                const validReports = areaReports.filter(report => {
                    const lat = parseFloat(report.latitude?.toString() || '0');
                    const lng = parseFloat(report.longitude?.toString() || '0');
                    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
                });

                if (validReports.length === 0) {
                    console.warn('No valid coordinates found for location group:', locationKey);
                    return null; // Skip this area
                }

                const avgLat = validReports.reduce((sum, report) => {
                    return sum + parseFloat(report.latitude?.toString() || '0');
                }, 0) / validReports.length;

                const avgLng = validReports.reduce((sum, report) => {
                    return sum + parseFloat(report.longitude?.toString() || '0');
                }, 0) / validReports.length;

                // Double-check the calculated averages
                if (isNaN(avgLat) || isNaN(avgLng)) {
                    console.error('Calculated NaN coordinates for area:', locationKey, { avgLat, avgLng, validReports });
                    return null; // Skip this area
                }

                // Determine overall severity level
                const severityLevels = areaReports.map(r => r.severityByUser);
                const hasCritical = severityLevels.includes('critical');
                const hasHigh = severityLevels.includes('high');
                const overallSeverity = hasCritical ? 'Critical' : hasHigh ? 'High' : 'Medium';

                // Determine cleanup effort based on report count
                const effortMap = {
                    small: areaReports.length <= 5,
                    medium: areaReports.length <= 10,
                    large: areaReports.length > 10,
                };
                const effort = Object.keys(effortMap).find(key => effortMap[key as keyof typeof effortMap]) || 'Medium';

                // Use the most common address as the location name, or create a coordinate-based name
                const addressCounts: { [key: string]: number } = {};
                areaReports.forEach(report => {
                    const addr = report.address || 'Unknown Location';
                    addressCounts[addr] = (addressCounts[addr] || 0) + 1;
                });
                
                const mostCommonAddress = Object.entries(addressCounts)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown Location';
                
                // Create a more descriptive location name
                const locationName = mostCommonAddress !== 'Unknown Location' 
                    ? mostCommonAddress 
                    : `Area ${avgLat.toFixed(4)}, ${avgLng.toFixed(4)}`;

                // Get unique pollution types for description
                const pollutionTypes = [...new Set(areaReports.map(r => r.pollutionType))];
                const pollutionTypesText = pollutionTypes.length > 1 
                    ? `${pollutionTypes.slice(0, -1).join(', ')} and ${pollutionTypes.slice(-1)}`
                    : pollutionTypes[0];

                return {
                    id: index + 1,
                    location: locationName,
                    coordinates: { 
                        lat: avgLat, 
                        lng: avgLng 
                    },
                    reportCount: areaReports.length,
                    severityLevel: overallSeverity,
                    lastReported: new Date(latestReport.created_at).toLocaleDateString(),
                    description: `${areaReports.length} verified reports of ${pollutionTypesText.toLowerCase()}`,
                    estimatedCleanupEffort: effort.charAt(0).toUpperCase() + effort.slice(1),
                    priority: hasCritical ? 'critical' : hasHigh ? 'high' : 'medium',
                    reports: areaReports,
                };
            })
            .filter(area => area !== null) as AreaReport[]; // Remove null areas

        console.log('Processed eligible areas:', areas); // Debug log
        setEligibleAreas(areas);
    };

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

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
        case "verified":
            return "bg-green-100 text-green-800";
        case "pending":
            return "bg-yellow-100 text-yellow-800";
        case "rejected":
            return "bg-red-100 text-red-800";
        case "active":
            return "bg-green-100 text-green-800";
        case "recruiting":
            return "bg-blue-100 text-blue-800";
        case "completed":
            return "bg-gray-100 text-gray-800";
        default:
            return "bg-gray-100 text-gray-800";
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

                // Refresh the events list
                fetchCreatedEvents();
                
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

    // Update the handleViewAreaDetails function
    const handleViewAreaDetails = (area: AreaReport) => {
        setSelectedArea(area);
        setShowAreaDetails(true);
    };

    if (isLoading) {
        return (
        <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
            <Navigation />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
                <p className="text-waterbase-600">Loading reports...</p>
                </div>
            </div>
            </div>
        </div>
        );
    }

    const handleApproveReport = async (reportId: number) => {
        try {
            const response = await fetch(`/api/reports/${reportId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ status: 'verified' }),
            });

            if (response.ok) {
                // Refresh reports to show updated status
                fetchReports();
                alert('Report approved successfully!');
            } else {
                throw new Error('Failed to approve report');
            }
        } catch (error) {
            console.error('Error approving report:', error);
            alert('Failed to approve report. Please try again.');
        }
    };

    const handleDeclineReport = async (reportId: number) => {
        if (!confirm('Are you sure you want to decline this report? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/reports/${reportId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ status: 'declined' }),
            });

            if (response.ok) {
                // Refresh reports to show updated status
                fetchReports();
                alert('Report declined successfully!');
            } else {
                throw new Error('Failed to decline report');
            }
        } catch (error) {
            console.error('Error declining report:', error);
            alert('Failed to decline report. Please try again.');
        }
    };

    const handleBulkApproveReports = async (pendingReports: Report[]) => {
        if (pendingReports.length === 0) return;
        
        if (!confirm(`Are you sure you want to approve all ${pendingReports.length} pending reports? This action cannot be undone.`)) {
            return;
        }

        try {
            // Show loading state
            const reportIds = pendingReports.map(r => r.id);
            
            const response = await fetch('/api/reports/bulk-status', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ 
                    report_ids: reportIds,
                    status: 'verified' 
                }),
            });

            if (response.ok) {
                // Refresh reports to show updated status
                fetchReports();
                alert(`Successfully approved ${pendingReports.length} reports!`);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to approve reports');
            }
        } catch (error) {
            console.error('Error bulk approving reports:', error);
            alert('Failed to approve all reports. Please try again.');
        }
    };

    const handleBulkDeclineReports = async (pendingReports: Report[]) => {
        if (pendingReports.length === 0) return;
        
        if (!confirm(`Are you sure you want to decline all ${pendingReports.length} pending reports? This action cannot be undone and will mark these reports as suspicious.`)) {
            return;
        }

        try {
            const reportIds = pendingReports.map(r => r.id);
            
            const response = await fetch('/api/reports/bulk-status', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ 
                    report_ids: reportIds,
                    status: 'declined' 
                }),
            });

            if (response.ok) {
                // Refresh reports to show updated status
                fetchReports();
                alert(`Successfully declined ${pendingReports.length} reports!`);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to decline reports');
            }
        } catch (error) {
            console.error('Error bulk declining reports:', error);
            alert('Failed to decline all reports. Please try again.');
        }
    };

    const handleEditEvent = (event: any) => {
        setEditingEvent(event);
        setEditEventData({
            title: event.title,
            date: event.date,
            time: event.time,
            duration: event.duration.toString(),
            maxVolunteers: event.maxVolunteers.toString(),
            description: event.description || "",
            rewardPoints: event.points.toString(),
            rewardBadge: event.badge || "",
            status: event.status,
        });
        setShowEditEvent(true);
    };

    const handleUpdateEvent = async () => {
        if (!editingEvent) return;

        try {
            const eventData = {
                title: editEventData.title,
                date: editEventData.date,
                time: editEventData.time,
                duration: parseFloat(editEventData.duration || "3.0"),
                maxVolunteers: parseInt(editEventData.maxVolunteers),
                description: editEventData.description,
                points: parseInt(editEventData.rewardPoints),
                badge: editEventData.rewardBadge,
                status: editEventData.status, // This will update the status too
            };

            console.log('Updating event with data:', eventData);

            const response = await fetch(`/api/events/${editingEvent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            if (response.ok) {
                setShowEditEvent(false);
                setEditingEvent(null);
                fetchCreatedEvents();
                alert('Event updated successfully!');
            } else {
                const errorData = await response.json();
                console.error('Update error response:', errorData);
                
                if (errorData.errors) {
                    const errorMessages = Object.entries(errorData.errors)
                        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                        .join('\n');
                    alert(`Validation errors:\n${errorMessages}`);
                } else {
                    alert(`Error: ${errorData.message || 'Failed to update event'}`);
                }
            }
        } catch (error) {
            console.error('Error updating event:', error);
            alert('Failed to update event. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
        <Navigation />

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
            <h1 className="text-3xl font-bold text-waterbase-950 mb-2">
                Organizer Portal
            </h1>
            <p className="text-waterbase-700 mb-4">
                Manage cleanup events and coordinate with volunteers for water
                pollution areas
            </p>
            <div className="flex items-center space-x-4">
                <Badge variant="outline" className="bg-enviro-50 text-enviro-700">
                LGU/NGO Access
                </Badge>
                <Badge
                variant="outline"
                className="bg-waterbase-50 text-waterbase-700"
                >
                Manila Bay Coalition
                </Badge>
                <Button
                variant="outline"
                size="sm"
                onClick={fetchReports}
                disabled={isLoading}
                >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                Refresh Data
                </Button>
            </div>
            </div>

            {/* Error Alert */}
            {error && (
            <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="areas" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Eligible Areas</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>My Events</span>
                </TabsTrigger>
                <TabsTrigger
                value="volunteers"
                className="flex items-center space-x-2"
                >
                <Users className="w-4 h-4" />
                <span>Volunteer Management</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="areas">
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

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => handleViewAreaDetails(area)}
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
            </TabsContent>

            {/* Keep existing Events and Volunteers tabs */}
            <TabsContent value="events">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-waterbase-950">
                            Your Cleanup Events
                        </h2>
                        <div className="flex items-center space-x-2">
                            <Badge className="bg-enviro-500 text-white">
                                {createdEvents.length} total events
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchCreatedEvents}
                                disabled={isLoadingEvents}
                            >
                                <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingEvents && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {isLoadingEvents ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin mr-2 text-waterbase-500" />
                            <span className="text-waterbase-600">Loading your events...</span>
                        </div>
                    ) : createdEvents.length === 0 ? (
                        <Card className="border-waterbase-200">
                            <CardContent className="p-8 text-center">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No Events Created Yet
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Create your first cleanup event from the eligible areas tab.
                                </p>
                                <Button 
                                    onClick={() => setActiveTab("areas")}
                                    className="bg-waterbase-500 hover:bg-waterbase-600"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Browse Eligible Areas
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {createdEvents.map((event) => (
                                <Card key={event.id} className="border-waterbase-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-waterbase-950 mb-2">
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                                    <div className="flex items-center space-x-1">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>{event.address}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>
                                                            {new Date(event.date).toLocaleDateString()} at {event.time}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{event.duration} hours</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-700">
                                                    {event.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge
                                                    className={cn(
                                                        "text-xs",
                                                        getStatusColor(event.status),
                                                    )}
                                                >
                                                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Volunteer Progress */}
                                            <Card className="border-gray-200">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">
                                                            Volunteers
                                                        </span>
                                                        <Users className="w-4 h-4 text-waterbase-600" />
                                                    </div>
                                                    <div className="text-2xl font-bold text-waterbase-950 mb-1">
                                                        {event.currentVolunteers || 0}/{event.maxVolunteers}
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-waterbase-500 h-2 rounded-full"
                                                            style={{
                                                                width: `${((event.currentVolunteers || 0) / event.maxVolunteers) * 100}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {event.maxVolunteers - (event.currentVolunteers || 0)} spots remaining
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Rewards Info */}
                                            <Card className="border-gray-200">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">
                                                            Rewards
                                                        </span>
                                                        <Award className="w-4 h-4 text-enviro-600" />
                                                    </div>
                                                    <div className="text-sm space-y-1">
                                                        <div>
                                                            <strong>{event.points}</strong> points
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            {event.badge}
                                                        </div>
                                                        {event.additional && (
                                                            <div className="text-xs text-gray-600">
                                                                {event.additional}
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Event Details & Actions */}
                                            <Card className="border-gray-200">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">
                                                            Event Details
                                                        </span>
                                                        <Target className="w-4 h-4 text-gray-600" />
                                                    </div>
                                                    <div className="text-xs text-gray-600 space-y-1 mb-3">
                                                        <div>📍 {parseFloat(event.latitude || '0').toFixed(4)}, {parseFloat(event.longitude || '0').toFixed(4)}</div>
                                                        <div>📅 Created: {new Date(event.created_at).toLocaleDateString()}</div>
                                                        <div>🆔 Event #{event.id}</div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-xs"
                                                        >
                                                            <MessageSquare className="w-3 h-3 mr-1" />
                                                            Message Volunteers
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-xs"
                                                        >
                                                            <Camera className="w-3 h-3 mr-1" />
                                                            Event Updates
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Event Actions */}
                                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                <span>Status: </span>
                                                <Badge variant="outline" className={cn("text-xs", getStatusColor(event.status))}>
                                                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {/* Edit Button - Always available for recruiting and active events */}
                                                {(event.status === 'recruiting' || event.status === 'active') && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => handleEditEvent(event)}
                                                    >
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        Edit Event
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Event Statistics */}
                    {createdEvents.length > 0 && (
                        <Card className="border-waterbase-200 mt-6">
                            <CardHeader>
                                <CardTitle>Event Statistics</CardTitle>
                                <CardDescription>
                                    Overview of your cleanup events performance
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-waterbase-50 rounded-lg">
                                        <div className="text-2xl font-bold text-waterbase-600">
                                            {createdEvents.length}
                                        </div>
                                        <div className="text-sm text-gray-600">Total Events</div>
                                    </div>
                                    <div className="text-center p-4 bg-enviro-50 rounded-lg">
                                        <div className="text-2xl font-bold text-enviro-600">
                                            {createdEvents.filter(e => e.status === 'active').length}
                                        </div>
                                        <div className="text-sm text-gray-600">Active Events</div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {createdEvents.reduce((sum, event) => sum + (event.currentVolunteers || 0), 0)}
                                        </div>
                                        <div className="text-sm text-gray-600">Total Volunteers</div>
                                    </div>
                                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {createdEvents.reduce((sum, event) => sum + event.points, 0)}
                                        </div>
                                        <div className="text-sm text-gray-600">Points Offered</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="volunteers">
                <div className="space-y-6">
                <h2 className="text-xl font-semibold text-waterbase-950">
                    Volunteer Management
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="border-waterbase-200">
                    <CardContent className="p-6 text-center">
                        <Users className="w-12 h-12 text-waterbase-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-waterbase-950">
                        127
                        </h3>
                        <p className="text-waterbase-600">Total Volunteers</p>
                    </CardContent>
                    </Card>

                    <Card className="border-waterbase-200">
                    <CardContent className="p-6 text-center">
                        <CheckCircle className="w-12 h-12 text-enviro-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-waterbase-950">
                        89
                        </h3>
                        <p className="text-waterbase-600">Active This Month</p>
                    </CardContent>
                    </Card>

                    <Card className="border-waterbase-200">
                    <CardContent className="p-6 text-center">
                        <Award className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-waterbase-950">
                        1,254
                        </h3>
                        <p className="text-waterbase-600">Points Awarded</p>
                    </CardContent>
                    </Card>
                </div>

                <Card className="border-waterbase-200">
                    <CardHeader>
                    <CardTitle>Recent Volunteer Activity</CardTitle>
                    <CardDescription>
                        Latest volunteers who signed up for your events
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>Volunteer management features coming soon</p>
                        <p className="text-sm">
                        You'll be able to view, communicate with, and reward your
                        volunteers here
                        </p>
                    </div>
                    </CardContent>
                </Card>
                </div>
            </TabsContent>
        </Tabs>

        {/* Area Details Dialog - Comprehensive view with images */}
        <Dialog open={showAreaDetails} onOpenChange={setShowAreaDetails}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
            <DialogTitle className="text-xl">📍 Area Details - {selectedArea?.location}</DialogTitle>
            <DialogDescription>
                Comprehensive overview of {selectedArea?.reportCount} reports in this area
            </DialogDescription>
            </DialogHeader>

            {selectedArea && (
            <div className="space-y-6">
                {/* Area Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-waterbase-50 to-enviro-50 rounded-lg">
                <div className="text-center">
                    <div className="text-2xl font-bold text-waterbase-600">{selectedArea.reportCount}</div>
                    <div className="text-sm text-gray-600">Total Reports</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-enviro-600">
                    {selectedArea.reports.filter(r => r.severityByUser === 'critical' || r.severityByUser === 'high').length}
                    </div>
                    <div className="text-sm text-gray-600">High Priority</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                    {selectedArea.reports.filter(r => r.status === 'verified').length}
                    </div>
                    <div className="text-sm text-gray-600">Verified</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-waterbase-600">{selectedArea.estimatedCleanupEffort}</div>
                    <div className="text-sm text-gray-600">Cleanup Effort</div>
                </div>
                </div>

                {/* Area Information */}
                <Card className="border-waterbase-200">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                    <span>Area Information</span>
                    <Badge className={cn("text-sm", getSeverityColor(selectedArea.severityLevel))}>
                        {selectedArea.severityLevel} Priority
                    </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="text-sm font-medium text-gray-600">Location</label>
                    <p className="text-sm mt-1">{selectedArea.location}</p>
                    </div>
                    <div>
                    <label className="text-sm font-medium text-gray-600">Coordinates</label>
                    <p className="text-sm mt-1 font-mono">
                        {selectedArea.coordinates.lat.toFixed(6)}, {selectedArea.coordinates.lng.toFixed(6)}
                    </p>
                    </div>
                    <div>
                    <label className="text-sm font-medium text-gray-600">Last Reported</label>
                    <p className="text-sm mt-1">{selectedArea.lastReported}</p>
                    </div>
                    <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-sm mt-1">{selectedArea.description}</p>
                    </div>
                </CardContent>
                </Card>

                {/* Reports Grid with Images */}
                <div className="space-y-4">
                <h3 className="text-lg font-semibold text-waterbase-950">Individual Reports</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {selectedArea.reports.map((report) => (
                    <Card key={report.id} className="border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                        <div className="flex gap-4">
                            {/* Image Container with Hover Zoom */}
                            <div className="relative w-24 h-24 flex-shrink-0">
                            <img
                                src={report.image.startsWith('data:') ? report.image : `data:image/jpeg;base64,${report.image}`}
                                alt={report.title}
                                className="w-full h-full object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                                onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTggMTdIMTJNOCAxM0gxNk04IDlIMTYiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                                }}
                                onClick={() => {
                                setSelectedReport(report);
                                setShowImageDialog(true);
                                }}
                                onMouseEnter={() => setHoveredImage(report.id.toString())}
                                onMouseLeave={() => setHoveredImage(null)}
                            />
                            
                            {/* Hover Zoom Modal */}
                            {hoveredImage === report.id.toString() && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 pointer-events-none">
                                <img
                                    src={report.image.startsWith('data:') ? report.image : `data:image/jpeg;base64,${report.image}`}
                                    alt={report.title}
                                    className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                />
                                </div>
                            )}
                            </div>

                            {/* Report Details */}
                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                    <h4 className="font-medium text-sm line-clamp-2">{report.title}</h4>
                                    <div className="flex gap-1">
                                        <Badge className={cn("text-xs", getSeverityColor(report.severityByUser))}>
                                            {report.severityByUser}
                                        </Badge>
                                        <Badge className={cn("text-xs", getStatusColor(report.status))}>
                                            {report.status}
                                        </Badge>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-gray-600 line-clamp-2">{report.content}</p>
                                
                                <div className="space-y-1 text-xs text-gray-500">
                                    <div>📍 {report.pollutionType}</div>
                                    <div>📅 {new Date(report.created_at).toLocaleDateString()}</div>
                                    {report.user && (
                                        <div>👤 {report.user.firstName} {report.user.lastName}</div>
                                    )}
                                    <div>💬 {report.content}</div>
                                </div>

                                {/* Action Buttons - Updated */}
                                <div className="flex gap-2 mt-2">
                                    {report.status === 'pending' ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                                                onClick={() => handleApproveReport(report.id)}
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleDeclineReport(report.id)}
                                            >
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                Decline
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => {
                                                setSelectedReport(report);
                                                setShowImageDialog(true);
                                            }}
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            View Details
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        </CardContent>
                    </Card>
                    ))}
                </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                        <Button variant="outline">
                            <MapPin className="w-4 h-4 mr-2" />
                            View on Map
                        </Button>
                        
                        {/* Bulk Actions for Pending Reports */}
                        {selectedArea.reports.some(r => r.status === 'pending') && (
                            <>
                                <Button
                                    variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => handleBulkApproveReports(selectedArea.reports.filter(r => r.status === 'pending'))}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve All Pending ({selectedArea.reports.filter(r => r.status === 'pending').length})
                                </Button>
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleBulkDeclineReports(selectedArea.reports.filter(r => r.status === 'pending'))}
                                >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Decline All Pending ({selectedArea.reports.filter(r => r.status === 'pending').length})
                                </Button>
                            </>
                        )}
                    </div>
                    
                    <div className="space-x-2">
                        <Button variant="outline" onClick={() => setShowAreaDetails(false)}>
                            Close
                        </Button>
                        <Button 
                            className="bg-waterbase-500 hover:bg-waterbase-600"
                            onClick={() => {
                                setShowAreaDetails(false);
                                setShowCreateEvent(true);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Cleanup Event
                        </Button>
                    </div>
                </div>
            </div>
            )}
        </DialogContent>
        </Dialog>
        {/* Edit Event Dialog */}
        <Dialog open={showEditEvent} onOpenChange={setShowEditEvent}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Cleanup Event</DialogTitle>
                    <DialogDescription>
                        Update event details for {editingEvent?.title}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="edit-title">Event Title *</Label>
                        <Input
                            id="edit-title"
                            value={editEventData.title}
                            onChange={(e) =>
                                setEditEventData({
                                    ...editEventData,
                                    title: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-date">Date *</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={editEventData.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) =>
                                    setEditEventData({
                                        ...editEventData,
                                        date: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-time">Time *</Label>
                            <Input
                                id="edit-time"
                                type="time"
                                value={editEventData.time}
                                onChange={(e) =>
                                    setEditEventData({
                                        ...editEventData,
                                        time: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-duration">Duration</Label>
                            <Select
                                value={editEventData.duration}
                                onValueChange={(value) =>
                                    setEditEventData({
                                        ...editEventData,
                                        duration: value,
                                    })
                                }
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
                            <Label htmlFor="edit-maxVolunteers">Max Volunteers *</Label>
                            <Input
                                id="edit-maxVolunteers"
                                type="number"
                                min="1"
                                value={editEventData.maxVolunteers}
                                onChange={(e) =>
                                    setEditEventData({
                                        ...editEventData,
                                        maxVolunteers: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Add Status Field */}
                    <div>
                        <Label htmlFor="edit-status">Event Status *</Label>
                        <Select
                            value={editEventData.status}
                            onValueChange={(value) =>
                                setEditEventData({
                                    ...editEventData,
                                    status: value,
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recruiting">Recruiting</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="edit-description">Event Description</Label>
                        <Textarea
                            id="edit-description"
                            value={editEventData.description}
                            onChange={(e) =>
                                setEditEventData({
                                    ...editEventData,
                                    description: e.target.value,
                                })
                            }
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-rewardPoints">Points</Label>
                            <Input
                                id="edit-rewardPoints"
                                type="number"
                                min="0"
                                value={editEventData.rewardPoints}
                                onChange={(e) =>
                                    setEditEventData({
                                        ...editEventData,
                                        rewardPoints: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-rewardBadge">Badge Title</Label>
                            <Input
                                id="edit-rewardBadge"
                                value={editEventData.rewardBadge}
                                onChange={(e) =>
                                    setEditEventData({
                                        ...editEventData,
                                        rewardBadge: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="flex space-x-2 pt-4">
                        <Button
                            onClick={handleUpdateEvent}
                            className="flex-1 bg-waterbase-500 hover:bg-waterbase-600"
                        >
                            Update Event
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowEditEvent(false);
                                setEditingEvent(null);
                            }}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </div>
    </div>
  );
};