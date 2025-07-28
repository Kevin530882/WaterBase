import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import {
    Calendar,
    MapPin,
    Users,
    Loader2,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { SufficientReportsTab } from "@/components/pagecomponents/organizer/SufficientReportsTab";
import { MyEventsTab } from "@/components/pagecomponents/organizer/MyEventsTab";
import { VolunteerManagementTab } from "@/components/pagecomponents/organizer/VolunteerManagementTab";
import { EditEvent } from "@/components/pagecomponents/organizer/EditEvent";
import { AreaDetails } from "@/components/pagecomponents/organizer/AreaDetails";

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
    const [showAreaDetails, setShowAreaDetails] = useState(false);
    const [createdEvents, setCreatedEvents] = useState<any[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);

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

        // Convert to eligible areas (minimum 1 reports per area)
        const areas: AreaReport[] = Object.entries(locationGroups)
            .filter(([_, reports]) => reports.length >= 1)
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

    const handleViewReport = (report: Report) => {
        setSelectedReport(report);
        setShowImageDialog(true);
    };

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
                        <TabsTrigger value="volunteers" className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>Volunteer Management</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Reported Areas Tab */}
                    <TabsContent value="areas">
                        <SufficientReportsTab 
                            eligibleAreas={eligibleAreas}
                            onCreateEvent={() => setShowCreateEvent(true)}
                            onSelectArea={(area) => {
                                setSelectedArea(area);
                                setShowAreaDetails(true);
                            }}
                            onRefresh={fetchCreatedEvents} // Add this prop
                        />
                    </TabsContent>

                    {/* Events Tab */}
                    <TabsContent value="events">
                        <MyEventsTab 
                            createdEvents={createdEvents}
                            isLoadingEvents={isLoadingEvents}
                            onEditEvent={setEditingEvent}
                            onRefresh={fetchCreatedEvents}
                            onTabChange={setActiveTab} // Add this prop
                        />
                    </TabsContent>

                    {/* Volunteers Tab */}
                    <TabsContent value="volunteers">
                        <VolunteerManagementTab />
                    </TabsContent>
                </Tabs>

                {/* Area Details Dialog */}
                <AreaDetails
                    isOpen={showAreaDetails}
                    onClose={() => setShowAreaDetails(false)}
                    selectedArea={selectedArea}
                    onCreateEvent={() => setShowCreateEvent(true)}
                    onApproveReport={handleApproveReport}
                    onDeclineReport={handleDeclineReport}
                    onBulkApproveReports={handleBulkApproveReports}
                    onBulkDeclineReports={handleBulkDeclineReports}
                    onViewReport={handleViewReport}
                />
                {/* Edit Event Dialog */}
                <EditEvent
                    isOpen={!!editingEvent}
                    onClose={() => setEditingEvent(null)}
                    event={editingEvent}
                    onSuccess={fetchCreatedEvents}
                />
            </div>
        </div>
    );
};