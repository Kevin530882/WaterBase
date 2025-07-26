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

// Mock existing cleanup events (keep as mockup)
const existingEvents = [
    {
    id: 1,
    title: "Manila Bay Restoration Drive",
    location: "Manila Bay, Manila",
    date: "2024-02-15",
    time: "07:00 AM",
    duration: "4 hours",
    maxVolunteers: 50,
    currentVolunteers: 32,
    status: "active",
    rewards: {
        type: "Points & Certificate",
        points: 100,
        certificate: "Environmental Champion",
        additional: "Meal provided",
    },
    organizer: "Manila Bay Coalition",
    description:
        "Large-scale cleanup focusing on plastic waste removal and water quality improvement.",
    },
    {
    id: 2,
    title: "Pasig River Community Clean",
    location: "Pasig River, Metro Manila",
    date: "2024-02-20",
    time: "06:30 AM",
    duration: "3 hours",
    maxVolunteers: 30,
    currentVolunteers: 12,
    status: "recruiting",
    rewards: {
        type: "Environmental Badge",
        points: 75,
        certificate: "River Guardian",
        additional: "Transportation allowance",
    },
    organizer: "Pasig River Watch",
    description:
        "Community-driven initiative to remove industrial waste and restore riverbank vegetation.",
    },
];

export const OrganizerPortal = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState("areas");
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [selectedArea, setSelectedArea] = useState<AreaReport | null>(null);
    const [showImageDialog, setShowImageDialog] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showAllImages, setShowAllImages] = useState(false);
    const [reports, setReports] = useState<Report[]>([]);
    const [eligibleAreas, setEligibleAreas] = useState<AreaReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [newEvent, setNewEvent] = useState({
        title: "",
        area: "",
        date: "",
        time: "",
        duration: "",
        maxVolunteers: "",
        description: "",
        rewardType: "",
        rewardPoints: "",
        rewardCertificate: "",
        rewardAdditional: "",
    });

    // Fetch reports from database
    useEffect(() => {
        fetchReports();
    }, []);

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

    // Process reports into areas with sufficient report counts
    const processEligibleAreas = (allReports: Report[]) => {
        // Group reports by location (address)
        const locationGroups: { [key: string]: Report[] } = {};
        
        allReports.forEach(report => {
        const location = report.address || 'Unknown Location';
        if (!locationGroups[location]) {
            locationGroups[location] = [];
        }
        locationGroups[location].push(report);
        });

        // Convert to eligible areas (minimum 3 reports per area)
        const areas: AreaReport[] = Object.entries(locationGroups)
        .filter(([_, reports]) => reports.length >= 3)
        .map(([location, areaReports], index) => {
            const latestReport = areaReports.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

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

            return {
            id: index + 1,
            location,
            coordinates: { 
                lat: latestReport.latitude, 
                lng: latestReport.longitude 
            },
            reportCount: areaReports.length,
            severityLevel: overallSeverity,
            lastReported: new Date(latestReport.created_at).toLocaleDateString(),
            description: `${areaReports.length} verified reports of ${latestReport.pollutionType.toLowerCase()}`,
            estimatedCleanupEffort: effort.charAt(0).toUpperCase() + effort.slice(1),
            priority: hasCritical ? 'critical' : hasHigh ? 'high' : 'medium',
            reports: areaReports,
            };
        });

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

    const handleCreateEvent = () => {
        console.log("Creating cleanup event:", newEvent);
        setShowCreateEvent(false);
        setNewEvent({
        title: "",
        area: "",
        date: "",
        time: "",
        duration: "",
        maxVolunteers: "",
        description: "",
        rewardType: "",
        rewardPoints: "",
        rewardCertificate: "",
        rewardAdditional: "",
        });
    };

    const handleViewAllImages = (area: AreaReport) => {
        setSelectedArea(area);
        setShowAllImages(true);
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
                                    Organize a cleanup event for{" "}
                                    {selectedArea?.location}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div>
                                    <Label htmlFor="title">Event Title</Label>
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
                                    />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                        id="date"
                                        type="date"
                                        value={newEvent.date}
                                        onChange={(e) =>
                                            setNewEvent({
                                            ...newEvent,
                                            date: e.target.value,
                                            })
                                        }
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="time">Time</Label>
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
                                        >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select duration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2 hours">
                                            2 hours
                                            </SelectItem>
                                            <SelectItem value="3 hours">
                                            3 hours
                                            </SelectItem>
                                            <SelectItem value="4 hours">
                                            4 hours
                                            </SelectItem>
                                            <SelectItem value="Half day">
                                            Half day
                                            </SelectItem>
                                            <SelectItem value="Full day">
                                            Full day
                                            </SelectItem>
                                        </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="maxVolunteers">
                                        Max Volunteers
                                        </Label>
                                        <Input
                                        id="maxVolunteers"
                                        type="number"
                                        placeholder="50"
                                        value={newEvent.maxVolunteers}
                                        onChange={(e) =>
                                            setNewEvent({
                                            ...newEvent,
                                            maxVolunteers: e.target.value,
                                            })
                                        }
                                        />
                                    </div>
                                    </div>

                                    <div>
                                    <Label htmlFor="description">
                                        Event Description
                                    </Label>
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
                                    />
                                    </div>

                                    {/* Rewards Section */}
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
                                            placeholder="100"
                                            value={newEvent.rewardPoints}
                                            onChange={(e) =>
                                            setNewEvent({
                                                ...newEvent,
                                                rewardPoints: e.target.value,
                                            })
                                            }
                                        />
                                        </div>
                                        <div>
                                        <Label htmlFor="rewardType">
                                            Reward Type
                                        </Label>
                                        <Select
                                            value={newEvent.rewardType}
                                            onValueChange={(value) =>
                                            setNewEvent({
                                                ...newEvent,
                                                rewardType: value,
                                            })
                                            }
                                        >
                                            <SelectTrigger>
                                            <SelectValue placeholder="Select reward type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                            <SelectItem value="certificate">
                                                Certificate Only
                                            </SelectItem>
                                            <SelectItem value="points">
                                                Points & Badge
                                            </SelectItem>
                                            <SelectItem value="premium">
                                                Points, Certificate & Perks
                                            </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="rewardCertificate">
                                        Certificate Title
                                        </Label>
                                        <Input
                                        id="rewardCertificate"
                                        placeholder="e.g., Environmental Champion, River Guardian"
                                        value={newEvent.rewardCertificate}
                                        onChange={(e) =>
                                            setNewEvent({
                                            ...newEvent,
                                            rewardCertificate: e.target.value,
                                            })
                                        }
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="rewardAdditional">
                                        Additional Rewards
                                        </Label>
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
                                        />
                                    </div>
                                    </div>

                                    <div className="flex space-x-2 pt-4">
                                    <Button
                                        onClick={handleCreateEvent}
                                        className="flex-1 bg-waterbase-500 hover:bg-waterbase-600"
                                    >
                                        Create Event
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowCreateEvent(false)}
                                        className="flex-1"
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
                                onClick={() => handleViewAllImages(area)}
                            >
                                <Image className="w-4 h-4 mr-2" />
                                View All Images ({area.reports.length})
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
                    <Badge className="bg-enviro-500 text-white">
                    {existingEvents.length} active events
                    </Badge>
                </div>

                <div className="space-y-4">
                    {existingEvents.map((event) => (
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
                                <span>{event.location}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                    {event.date} at {event.time}
                                </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{event.duration}</span>
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
                                {event.status}
                            </Badge>
                            <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                            </Button>
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
                                {event.currentVolunteers}/{event.maxVolunteers}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-waterbase-500 h-2 rounded-full"
                                    style={{
                                    width: `${(event.currentVolunteers / event.maxVolunteers) * 100}%`,
                                    }}
                                />
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
                                    <strong>{event.rewards.points}</strong> points
                                </div>
                                <div className="text-xs text-gray-600">
                                    {event.rewards.certificate}
                                </div>
                                <div className="text-xs text-gray-600">
                                    {event.rewards.additional}
                                </div>
                                </div>
                            </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card className="border-gray-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">
                                    Actions
                                </span>
                                <Target className="w-4 h-4 text-gray-600" />
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
                        </CardContent>
                    </Card>
                    ))}
                </div>
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

        {/* Image Gallery Dialog - Updated to match report submission modal style */}
        <Dialog open={showAllImages} onOpenChange={setShowAllImages}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
            <DialogTitle className="text-xl">📸 All Images - {selectedArea?.location}</DialogTitle>
            <DialogDescription>
                {selectedArea?.reportCount} photos submitted by users in this area. Click any image to view full size.
            </DialogDescription>
            </DialogHeader>

            {selectedArea?.reports && selectedArea.reports.length > 0 ? (
            <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                    <div className="text-2xl font-bold text-waterbase-600">{selectedArea.reportCount}</div>
                    <div className="text-sm text-gray-600">Total Reports</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-enviro-600">
                    {selectedArea.reports.filter(r => r.severityByUser === 'critical' || r.severityByUser === 'high').length}
                    </div>
                    <div className="text-sm text-gray-600">High/Critical</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-waterbase-600">
                    {selectedArea.reports.filter(r => r.status === 'verified').length}
                    </div>
                    <div className="text-sm text-gray-600">Verified</div>
                </div>
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedArea.reports.map((report, index) => (
                    <Card key={report.id} className="border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-0">
                        {/* Image Container */}
                        <div className="relative">
                        <img
                            src={report.image.startsWith('data:') ? report.image : `data:image/jpeg;base64,${report.image}`}
                            alt={report.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                            onError={(e) => {
                            console.log('Image load error for report:', report.id);
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTggMTdIMTJNOCAxM0gxNk04IDlIMTYiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                            }}
                            onClick={() => {
                            setSelectedReport(report);
                            setShowImageDialog(true);
                            }}
                        />
                        
                        {/* Severity Badge Overlay */}
                        <div className="absolute top-2 right-2">
                            <Badge className={cn("text-xs", getSeverityColor(report.severityByUser))}>
                            {report.severityByUser}
                            </Badge>
                        </div>
                        
                        {/* Status Badge Overlay */}
                        <div className="absolute top-2 left-2">
                            <Badge className={cn("text-xs", getStatusColor(report.status))}>
                            {report.status}
                            </Badge>
                        </div>
                        </div>

                        {/* Report Info */}
                        <div className="p-3 space-y-2">
                        <h4 className="font-medium text-sm line-clamp-2">{report.title}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{report.content}</p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>#{report.id}</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                            📍 {report.pollutionType}
                        </div>
                        
                        {report.user && (
                            <div className="text-xs text-gray-500">
                            👤 {report.user.firstName} {report.user.lastName}
                            </div>
                        )}
                        </div>
                    </CardContent>
                    </Card>
                ))}
                </div>
            </div>
            ) : (
            <div className="text-center py-8">
                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No images found for this area</p>
            </div>
            )}

            <div className="flex justify-end pt-4 border-t">
            <Button 
                variant="outline" 
                onClick={() => setShowAllImages(false)}
            >
                Close Gallery
            </Button>
            </div>
        </DialogContent>
        </Dialog>

        {/* Individual Report Image Dialog - Enhanced */}
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
            <DialogTitle className="text-lg">{selectedReport?.title}</DialogTitle>
            <DialogDescription>
                Report #{selectedReport?.id} • {selectedReport?.pollutionType} • 
                Submitted {selectedReport && new Date(selectedReport.created_at).toLocaleDateString()}
            </DialogDescription>
            </DialogHeader>

            {selectedReport && (
            <div className="space-y-6">
                {/* Large Image Display */}
                <div className="flex justify-center">
                <img
                    src={selectedReport.image.startsWith('data:') ? selectedReport.image : `data:image/jpeg;base64,${selectedReport.image}`}
                    alt={selectedReport.title}
                    className="max-w-full max-h-96 object-contain rounded-lg border shadow-lg"
                    onError={(e) => {
                    console.log('Image load error for report:', selectedReport.id);
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTggMTdIMTJNOCAxM0gxNk04IDlIMTYiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                    }}
                />
                </div>

                {/* Report Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                    <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Report Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-sm mt-1">{selectedReport.content}</p>
                        </div>
                        
                        <div>
                        <label className="text-sm font-medium text-gray-600">Pollution Type</label>
                        <p className="text-sm mt-1">{selectedReport.pollutionType}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-gray-600">Severity</label>
                            <div className="mt-1">
                            <Badge className={cn("text-xs", getSeverityColor(selectedReport.severityByUser))}>
                                {selectedReport.severityByUser}
                            </Badge>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-600">Status</label>
                            <div className="mt-1">
                            <Badge className={cn("text-xs", getStatusColor(selectedReport.status))}>
                                {selectedReport.status}
                            </Badge>
                            </div>
                        </div>
                        </div>
                    </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Location & Reporter</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                        <label className="text-sm font-medium text-gray-600">Address</label>
                        <p className="text-sm mt-1">{selectedReport.address}</p>
                        </div>
                        
                        <div>
                        <label className="text-sm font-medium text-gray-600">Coordinates</label>
                        <p className="text-sm mt-1 font-mono">
                            {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                        </p>
                        </div>
                        
                        {selectedReport.user && (
                        <div>
                            <label className="text-sm font-medium text-gray-600">Reported By</label>
                            <p className="text-sm mt-1">
                            {selectedReport.user.firstName} {selectedReport.user.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{selectedReport.user.email}</p>
                        </div>
                        )}
                        
                        <div>
                        <label className="text-sm font-medium text-gray-600">Report ID</label>
                        <p className="text-sm mt-1 font-mono">#{selectedReport.id}</p>
                        </div>
                        
                        <div>
                        <label className="text-sm font-medium text-gray-600">Submitted</label>
                        <p className="text-sm mt-1">
                            {new Date(selectedReport.created_at).toLocaleDateString()} at {new Date(selectedReport.created_at).toLocaleTimeString()}
                        </p>
                        </div>
                    </CardContent>
                    </Card>
                </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                <Button variant="outline">
                    <MapPin className="w-4 h-4 mr-2" />
                    View on Map
                </Button>
                <div className="space-x-2">
                    <Button variant="outline" onClick={() => setShowImageDialog(false)}>
                    Close
                    </Button>
                    <Button className="bg-waterbase-500 hover:bg-waterbase-600">
                    <Eye className="w-4 h-4 mr-2" />
                    Mark as Reviewed
                    </Button>
                </div>
                </div>
            </div>
            )}
        </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};