import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
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
        if (!token) {
            console.log('No token available');
            return;
        }
        
        try {
            setIsLoading(true);
            setError("");
            
            console.log('Fetching reports...');
            console.log('Token:', token ? 'Present' : 'Missing');
            console.log('User:', user);
            
            // First, let's get ALL reports to see what we have
            const response = await fetch('/api/reports', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                const allReports = await response.json();
                console.log('ALL REPORTS RAW:', allReports);
                console.log('ALL REPORTS COUNT:', allReports.length);
                console.log('ALL REPORTS TYPE:', typeof allReports);
                
                // Log each report to see what we have
                if (Array.isArray(allReports)) {
                    allReports.forEach((report, index) => {
                        console.log(`Report ${index}:`, {
                            id: report.id,
                            title: report.title,
                            address: report.address,
                            status: report.status,
                            latitude: report.latitude,
                            longitude: report.longitude
                        });
                    });
                } else {
                    console.log('Reports is not an array:', allReports);
                }
                
                // Filter manually for now to debug
                const filteredReports = user?.areaOfResponsibility 
                    ? allReports.filter(report => {
                        const matches = report.address && 
                            report.address.toLowerCase().includes(user.areaOfResponsibility.toLowerCase());
                        console.log(`Report ${report.id} (${report.address}) matches area ${user.areaOfResponsibility}: ${matches}`);
                        return matches;
                    })
                    : allReports;
                
                console.log('FILTERED REPORTS:', filteredReports);
                console.log('FILTERED REPORTS COUNT:', filteredReports.length);
                
                setReports(filteredReports);
                processEligibleAreas(filteredReports);
            } else {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`Failed to fetch reports: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            setError('Failed to load reports. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const calculateSeverityLevel = (reports: Report[]): string => {
        const severityLevels = reports.map(r => r.severityByUser?.toLowerCase() || 'low');
        
        if (severityLevels.includes('critical')) return 'Critical';
        if (severityLevels.includes('high')) return 'High';
        if (severityLevels.includes('medium')) return 'Medium';
        return 'Low';
    };

    const estimateCleanupEffort = (reports: Report[]): string => {
        const count = reports.length;
        if (count >= 10) return 'High effort required';
        if (count >= 5) return 'Medium effort required';
        return 'Low effort required';
    };

    const calculatePriority = (reports: Report[]): string => {
        const severityLevel = calculateSeverityLevel(reports);
        const count = reports.length;
        
        if (severityLevel === 'Critical' || count >= 10) return 'High';
        if (severityLevel === 'High' || count >= 5) return 'Medium';
        return 'Low';
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
    const processEligibleAreas = (reports: Report[]) => {
        console.log('Processing eligible areas with reports:', reports);
        
        if (!reports || reports.length === 0) {
            console.log('No reports to process');
            setEligibleAreas([]);
            return;
        }

        // Group reports by location (using latitude/longitude proximity)
        const locationGroups: { [key: string]: Report[] } = {};
        const DISTANCE_THRESHOLD = 0.01; // Approximately 1km

        reports.forEach((report) => {
            console.log('Processing report:', {
                id: report.id,
                address: report.address,
                lat: report.latitude,
                lng: report.longitude,
                status: report.status
            });

            if (!report.latitude || !report.longitude) {
                console.log('Report missing coordinates, skipping:', report.id);
                return;
            }

            let foundGroup = false;
            
            // Check if this report belongs to an existing group
            Object.keys(locationGroups).forEach((groupKey) => {
                if (foundGroup) return;
                
                const [groupLat, groupLng] = groupKey.split(',').map(Number);
                const distance = Math.sqrt(
                    Math.pow(report.latitude - groupLat, 2) + 
                    Math.pow(report.longitude - groupLng, 2)
                );
                
                if (distance <= DISTANCE_THRESHOLD) {
                    locationGroups[groupKey].push(report);
                    foundGroup = true;
                    console.log(`Added report ${report.id} to existing group at ${groupKey}`);
                }
            });
            
            // If no group found, create a new one
            if (!foundGroup) {
                const newGroupKey = `${report.latitude},${report.longitude}`;
                locationGroups[newGroupKey] = [report];
                console.log(`Created new group for report ${report.id} at ${newGroupKey}`);
            }
        });

        console.log('Location groups:', locationGroups);

        // Convert groups to eligible areas (only groups with 3+ reports)
        const areas: AreaReport[] = Object.entries(locationGroups)
            .filter(([_, groupReports]) => {
                const hasEnoughReports = groupReports.length >= 1;
                console.log(`Group with ${groupReports.length} reports: ${hasEnoughReports ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
                return hasEnoughReports;
            })
            .map(([locationKey, groupReports], index) => {
                const [lat, lng] = locationKey.split(',').map(Number);
                const mostRecentReport = groupReports.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                const area = {
                    id: index + 1,
                    location: mostRecentReport.address || `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    coordinates: { lat, lng },
                    reportCount: groupReports.length,
                    severityLevel: calculateSeverityLevel(groupReports),
                    lastReported: formatDistanceToNow(new Date(mostRecentReport.created_at), { addSuffix: true }),
                    description: `Water pollution area with ${groupReports.length} verified reports`,
                    estimatedCleanupEffort: estimateCleanupEffort(groupReports),
                    priority: calculatePriority(groupReports),
                    reports: groupReports,
                };

                console.log('Created eligible area:', area);
                return area;
            });

        console.log('Final eligible areas:', areas);
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
                        Manage cleanup events and coordinate with volunteers for water pollution areas
                        {user?.areaOfResponsibility && (
                            <span className="block text-sm mt-1">
                                📍 Showing reports for: <strong>{user.areaOfResponsibility}</strong>
                            </span>
                        )}
                    </p>
                    <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="bg-enviro-50 text-enviro-700">
                            {user?.role?.toUpperCase()} Access
                        </Badge>
                        {user?.organization && (
                            <Badge variant="outline" className="bg-waterbase-50 text-waterbase-700">
                                {user.organization}
                            </Badge>
                        )}
                        {user?.areaOfResponsibility && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                Area: {user.areaOfResponsibility}
                            </Badge>
                        )}
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
                            onRefresh={() => {
                                fetchReports();
                                fetchCreatedEvents();
                            }}
                            createdEvents={createdEvents}
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