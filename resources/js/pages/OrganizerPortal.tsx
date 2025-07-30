import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import { Calendar, MapPin, Users, Loader2, AlertCircle, RefreshCw, } from "lucide-react";
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
    // New location-based fields
    region_code?: string;
    region_name?: string;
    province_name?: string;
    municipality_name?: string;
    barangay_name?: string;
    report_group_id?: number;
    geocoded_at?: string;
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

    // State declarations
    const [activeTab, setActiveTab] = useState("areas");
    const [selectedArea, setSelectedArea] = useState<AreaReport | null>(null);
    const [eligibleAreas, setEligibleAreas] = useState<AreaReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAreaDetails, setShowAreaDetails] = useState(false);
    const [createdEvents, setCreatedEvents] = useState<any[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);

    // Fetch accessible reports using location-based access control
    const fetchReports = async () => {
        if (!token) {
            console.log('No token available');
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            console.log('Fetching accessible reports...');
            console.log('Token:', token ? 'Present' : 'Missing');
            console.log('API URL:', '/api/reports/accessible');

            // Use the new location-based access control endpoint
            const response = await fetch('/api/reports/accessible', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers); if (response.ok) {
                const data = await response.json();
                console.log('ACCESSIBLE REPORTS DATA:', data);

                // Extract reports from the response structure
                const accessibleReports = data.reports?.data || data.reports || [];
                console.log('ACCESSIBLE REPORTS:', accessibleReports);
                console.log('USER AREA:', data.user_area);

                processEligibleAreas(accessibleReports);
            } else {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`Failed to fetch accessible reports: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching accessible reports:', error);
            setError('Failed to load accessible reports. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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

    // Process reports into eligible areas using report groups or legacy grouping
    const processEligibleAreas = (reports: Report[]) => {
        console.log('Processing eligible areas with reports:', reports);

        if (!reports || reports.length === 0) {
            console.log('No reports to process');
            setEligibleAreas([]);
            return;
        }

        // Check if reports have report_group_id (from the new system)
        const reportsWithGroups = reports.filter(report => report.report_group_id);

        if (reportsWithGroups.length > 0) {
            console.log('Using report groups for area processing');
            processAreasFromReportGroups(reports);
        } else {
            console.log('Falling back to legacy coordinate-based grouping');
            processAreasLegacy(reports);
        }
    };

    // Process areas using the new report groups system
    const processAreasFromReportGroups = (reports: Report[]) => {
        // Group reports by report_group_id
        const groupedReports: { [key: number]: Report[] } = {};

        reports.forEach(report => {
            if (report.report_group_id) {
                if (!groupedReports[report.report_group_id]) {
                    groupedReports[report.report_group_id] = [];
                }
                groupedReports[report.report_group_id].push(report);
            }
        });

        // Convert groups to eligible areas with declined report filtering
        const areas: AreaReport[] = Object.entries(groupedReports)
            .map(([groupId, groupReports]) => {
                // Filter out declined reports from the group
                const activeReports = groupReports.filter(report => report.status !== 'declined');

                // If all reports in the group are declined, exclude this group entirely
                if (activeReports.length === 0) {
                    return null;
                }

                const mostRecentReport = activeReports.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                // Use the most specific location available
                const location = mostRecentReport.barangay_name
                    ? `${mostRecentReport.barangay_name}, ${mostRecentReport.municipality_name}, ${mostRecentReport.province_name}`
                    : mostRecentReport.municipality_name
                        ? `${mostRecentReport.municipality_name}, ${mostRecentReport.province_name}`
                        : mostRecentReport.province_name
                            ? mostRecentReport.province_name
                            : mostRecentReport.address || `Location ${mostRecentReport.latitude?.toFixed(4)}, ${mostRecentReport.longitude?.toFixed(4)}`;

                const pollutionTypes = [...new Set(activeReports.map(r => r.pollutionType))];
                const description = activeReports.length === 1
                    ? `${pollutionTypes[0]} pollution reported`
                    : `Multiple pollution types: ${pollutionTypes.join(', ')} (${activeReports.length} reports)`;

                return {
                    id: parseInt(groupId),
                    location,
                    coordinates: {
                        lat: mostRecentReport.latitude,
                        lng: mostRecentReport.longitude
                    },
                    reportCount: activeReports.length,
                    severityLevel: calculateSeverityLevel(activeReports),
                    lastReported: formatDistanceToNow(new Date(mostRecentReport.created_at), { addSuffix: true }),
                    description,
                    estimatedCleanupEffort: estimateCleanupEffort(activeReports),
                    priority: calculatePriority(activeReports),
                    reports: activeReports,
                };
            })
            .filter(area => area !== null);

        console.log('Areas from report groups:', areas);
        setEligibleAreas(areas);
    };

    // Legacy function for coordinate-based grouping (fallback)
    const processAreasLegacy = (reports: Report[]) => {
        // First filter out declined individual reports for legacy grouping
        const activeReports = reports.filter(report => report.status !== 'declined');

        // Group reports by location (using latitude/longitude proximity)
        const locationGroups: { [key: string]: Report[] } = {};
        const DISTANCE_THRESHOLD = 0.001; // approximately 100m

        activeReports.forEach((report) => {
            if (!report.latitude || !report.longitude) {
                return;
            }

            let foundGroup = false;

            Object.keys(locationGroups).forEach((groupKey) => {
                if (foundGroup) return;

                const [groupLat, groupLng] = groupKey.split(',').map(Number);
                const distance = Math.sqrt(
                    Math.pow(report.latitude - groupLat, 2) +
                    Math.pow(report.longitude - groupLng, 2)
                );

                if (distance <= DISTANCE_THRESHOLD) {
                    const existingReports = locationGroups[groupKey];
                    const shouldGroup = canGroupReports(report, existingReports[0]);

                    if (shouldGroup) {
                        locationGroups[groupKey].push(report);
                        foundGroup = true;
                    }
                }
            });

            if (!foundGroup) {
                const newGroupKey = `${report.latitude},${report.longitude}`;
                locationGroups[newGroupKey] = [report];
            }
        });

        // Convert groups to eligible areas
        const areas: AreaReport[] = Object.entries(locationGroups)
            .filter(([_, groupReports]) => groupReports.length >= 1)
            .map(([locationKey, groupReports], index) => {
                const [lat, lng] = locationKey.split(',').map(Number);
                const mostRecentReport = groupReports.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                const pollutionTypes = [...new Set(groupReports.map(r => r.pollutionType))];
                const description = groupReports.length === 1
                    ? `${pollutionTypes[0]} pollution reported`
                    : `Multiple pollution types: ${pollutionTypes.join(', ')} (${groupReports.length} reports)`;

                return {
                    id: index + 1,
                    location: mostRecentReport.address || `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    coordinates: { lat, lng },
                    reportCount: groupReports.length,
                    severityLevel: calculateSeverityLevel(groupReports),
                    lastReported: formatDistanceToNow(new Date(mostRecentReport.created_at), { addSuffix: true }),
                    description,
                    estimatedCleanupEffort: estimateCleanupEffort(groupReports),
                    priority: calculatePriority(groupReports),
                    reports: groupReports,
                };
            });

        setEligibleAreas(areas);
    };

    // Helper function to determine if reports should be grouped
    const canGroupReports = (newReport: Report, existingReport: Report): boolean => {
        const latDiff = Math.abs(newReport.latitude - existingReport.latitude);
        const lngDiff = Math.abs(newReport.longitude - existingReport.longitude);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        if (distance > 0.001) return false;
        if (newReport.latitude === existingReport.latitude &&
            newReport.longitude === existingReport.longitude) return true;

        // Group by location and time only (ignore pollution type and severity)
        const timeDiff = Math.abs(
            new Date(newReport.created_at).getTime() - new Date(existingReport.created_at).getTime()
        );
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        return daysDiff <= 7; // Group if within 7 days and same location
    };

    const calculateSeverityLevel = (reports: Report[]): string => {
        if (reports.length === 0) return 'Low';

        // Map severity levels to numerical values for averaging
        const severityMap = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4
        };

        const reverseSeverityMap = {
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Critical'
        };

        // Calculate average severity
        const severityValues = reports.map(r => {
            const severity = r.severityByUser?.toLowerCase() || 'low';
            return severityMap[severity as keyof typeof severityMap] || 1;
        });

        const averageSeverity = severityValues.reduce((sum, val) => sum + val, 0) / severityValues.length;

        // Round to nearest severity level
        const roundedSeverity = Math.round(averageSeverity);

        return reverseSeverityMap[roundedSeverity as keyof typeof reverseSeverityMap] || 'Low';
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
        fetchReports();
        if (user?.id) {
            fetchCreatedEvents();
        }
    }, [user?.id, token]);

    const handleViewReport = (report: Report) => {
        console.log('Viewing report:', report);
        // Functionality can be implemented later if needed
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

        if (!confirm(`Are you sure you want to approve all ${pendingReports.length} pending reports?`)) {
            return;
        }

        try {
            const reportIds = pendingReports.map(r => r.id);
            console.log('Bulk approving report IDs:', reportIds);

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

            console.log('Bulk approve response status:', response.status);

            if (response.ok) {
                const responseData = await response.json();
                console.log('Bulk approve success:', responseData);
                fetchReports();
                alert(`Successfully approved ${pendingReports.length} reports!`);
            } else {
                const errorData = await response.json();
                console.error('Bulk approve error:', errorData);
                throw new Error(errorData.message || 'Failed to approve reports');
            }
        } catch (error) {
            console.error('Error bulk approving reports:', error);
            alert('Failed to approve all reports. Please try again.');
        }
    };

    const handleBulkDeclineReports = async (pendingReports: Report[]) => {
        if (pendingReports.length === 0) return;

        if (!confirm(`Are you sure you want to decline all ${pendingReports.length} pending reports?`)) {
            return;
        }

        try {
            const reportIds = pendingReports.map(r => r.id);
            console.log('Bulk declining report IDs:', reportIds);

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

            console.log('Bulk decline response status:', response.status);

            if (response.ok) {
                const responseData = await response.json();
                console.log('Bulk decline success:', responseData);
                fetchReports();
                alert(`Successfully declined ${pendingReports.length} reports!`);
            } else {
                const errorData = await response.json();
                console.error('Bulk decline error:', errorData);
                throw new Error(errorData.message || 'Failed to decline reports');
            }
        } catch (error) {
            console.error('Error bulk declining reports:', error);
            alert('Failed to decline all reports. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
                <Navigation />
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
                            <p className="text-waterbase-600">Loading accessible reports...</p>
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
                        Manage cleanup events with location-based access control
                        {user?.areaOfResponsibility && (
                            <span className="block text-sm mt-1">
                                📍 Your area of responsibility: <strong>{user.areaOfResponsibility}</strong>
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
                            onCreateEvent={() => console.log('Create event triggered')}
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
                            onTabChange={setActiveTab}
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
                    onCreateEvent={() => console.log('Create event from area details')}
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
