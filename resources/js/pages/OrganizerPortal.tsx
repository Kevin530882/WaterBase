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

            // Fetch accessible reports based on user's area
            const response = await fetch('/api/reports/accessible', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            if (response.ok) {
                const data = await response.json();
                console.log('ACCESSIBLE REPORTS DATA:', data);

                // The API should return reports directly as an array
                const allReports = Array.isArray(data) ? data : (data.reports || data.data || []);
                console.log('ALL REPORTS FROM API:', allReports);

                // Filter for verified reports only (for cleanup events)
                const verifiedReports = allReports.filter((r: Report) => r.status === 'verified');
                console.log('VERIFIED REPORTS:', verifiedReports);
                console.log('USER AREA:', user?.areaOfResponsibility);

                processEligibleAreas(verifiedReports);
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
            console.log('Fetching created events for user:', user.id);

            const response = await fetch(`/api/events?user_id=${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Fetched events:', data);
                setCreatedEvents(data);
            } else {
                console.error('Failed to fetch events:', response.status);
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
        console.log('Current createdEvents:', createdEvents);

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

    // Helper functions to check event-location relationships
    const areLocationsMatching = (coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }) => {
        const latDiff = Math.abs(coord1.lat - coord2.lat);
        const lngDiff = Math.abs(coord1.lng - coord2.lng);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        return distance <= 0.001; // approximately 100m threshold
    };

    const checkIfLocationHasEvent = (coordinates: { lat: number; lng: number }) => {
        console.log('Checking if location has event:', coordinates);
        console.log('Available events:', createdEvents);

        if (!createdEvents || createdEvents.length === 0) {
            console.log('No events available');
            return false;
        }

        const hasEvent = createdEvents.some(event => {
            const eventCoords = { lat: event.latitude, lng: event.longitude };
            const isMatching = areLocationsMatching(eventCoords, coordinates);
            console.log(`Event at ${eventCoords.lat}, ${eventCoords.lng} matches ${coordinates.lat}, ${coordinates.lng}:`, isMatching);
            return isMatching;
        });

        console.log('Location has event:', hasEvent);
        return hasEvent;
    };

    const getMostRecentEventDateForLocation = (coordinates: { lat: number; lng: number }) => {
        if (!createdEvents || createdEvents.length === 0) return new Date(0);

        const eventsAtLocation = createdEvents.filter(event => {
            const eventCoords = { lat: event.latitude, lng: event.longitude };
            return areLocationsMatching(eventCoords, coordinates);
        });

        if (eventsAtLocation.length === 0) return new Date(0);

        // Find the most recent event date
        const mostRecentEvent = eventsAtLocation.sort((a, b) =>
            new Date(b.created_at || b.createdAt || b.date).getTime() - new Date(a.created_at || a.createdAt || a.date).getTime()
        )[0];

        return new Date(mostRecentEvent.created_at || mostRecentEvent.createdAt || mostRecentEvent.date);
    };

    // Helper function to get location string from report
    const getLocationString = (report: Report) => {
        return report.barangay_name
            ? `${report.barangay_name}, ${report.municipality_name}, ${report.province_name}`
            : report.municipality_name
                ? `${report.municipality_name}, ${report.province_name}`
                : report.province_name
                    ? report.province_name
                    : report.address || `Location ${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`;
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

        // Convert groups to eligible areas with event-aware splitting
        const areas: AreaReport[] = [];
        let areaIdCounter = 1;

        Object.entries(groupedReports).forEach(([, groupReports]) => {
            // Filter out declined reports from the group
            const activeReports = groupReports.filter(report => report.status !== 'declined');

            // If all reports in the group are declined, skip this group entirely
            if (activeReports.length === 0) {
                return;
            }

            const mostRecentReport = activeReports.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

            const locationCoords = { lat: mostRecentReport.latitude, lng: mostRecentReport.longitude };
            const hasExistingEvent = checkIfLocationHasEvent(locationCoords);

            if (hasExistingEvent) {
                const mostRecentEventDate = getMostRecentEventDateForLocation(locationCoords);

                // Only get reports after the most recent event (skip older reports with existing events)
                const reportsAfterEvent = activeReports.filter(report =>
                    new Date(report.created_at) > mostRecentEventDate
                );

                // Skip creating area for old reports (with existing event) - we don't want to show these
                // if (reportsBeforeEvent.length > 0) { ... } - REMOVED

                // Create separate area for new reports (after the event)
                if (reportsAfterEvent.length > 0) {
                    const newestReport = reportsAfterEvent.sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )[0];

                    const location = getLocationString(newestReport);

                    const pollutionTypes = [...new Set(reportsAfterEvent.map(r => r.pollutionType))];
                    const description = reportsAfterEvent.length === 1
                        ? `${pollutionTypes[0]} pollution reported`
                        : `Multiple pollution types: ${pollutionTypes.join(', ')} (${reportsAfterEvent.length} reports)`;

                    areas.push({
                        id: areaIdCounter++,
                        location: `${location} (New Reports)`,
                        coordinates: {
                            lat: newestReport.latitude,
                            lng: newestReport.longitude
                        },
                        reportCount: reportsAfterEvent.length,
                        severityLevel: calculateSeverityLevel(reportsAfterEvent),
                        lastReported: formatDistanceToNow(new Date(newestReport.created_at), { addSuffix: true }),
                        description,
                        estimatedCleanupEffort: estimateCleanupEffort(reportsAfterEvent),
                        priority: calculatePriority(reportsAfterEvent),
                        reports: reportsAfterEvent,
                    });
                }
            } else {
                // No existing event - create single area for all reports
                const location = getLocationString(mostRecentReport);

                const pollutionTypes = [...new Set(activeReports.map(r => r.pollutionType))];
                const description = activeReports.length === 1
                    ? `${pollutionTypes[0]} pollution reported`
                    : `Multiple pollution types: ${pollutionTypes.join(', ')} (${activeReports.length} reports)`;

                areas.push({
                    id: areaIdCounter++,
                    location: location,
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
                });
            }
        });

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

        // Convert groups to eligible areas with event-aware splitting
        const areas: AreaReport[] = [];
        let areaIdCounter = 1;

        Object.entries(locationGroups)
            .filter(([_, groupReports]) => groupReports.length >= 1)
            .forEach(([locationKey, groupReports]) => {
                const [lat, lng] = locationKey.split(',').map(Number);

                // Check if this location already has a cleanup event
                const locationCoords = { lat, lng };
                const hasExistingEvent = checkIfLocationHasEvent(locationCoords);

                if (hasExistingEvent) {
                    const mostRecentEventDate = getMostRecentEventDateForLocation(locationCoords);

                    // Only get reports after the most recent event (skip older reports with existing events)
                    const reportsAfterEvent = groupReports.filter(report =>
                        new Date(report.created_at) > mostRecentEventDate
                    );

                    // Skip creating area for old reports (with existing event) - we don't want to show these
                    // if (reportsBeforeEvent.length > 0) { ... } - REMOVED

                    // Create separate area for new reports (after the event)
                    if (reportsAfterEvent.length > 0) {
                        const newestReport = reportsAfterEvent.sort((a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )[0];

                        const pollutionTypes = [...new Set(reportsAfterEvent.map(r => r.pollutionType))];
                        const description = reportsAfterEvent.length === 1
                            ? `${pollutionTypes[0]} pollution reported`
                            : `Multiple pollution types: ${pollutionTypes.join(', ')} (${reportsAfterEvent.length} reports)`;

                        const baseLocation = newestReport.address || `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

                        areas.push({
                            id: areaIdCounter++,
                            location: `${baseLocation} (New Reports)`,
                            coordinates: { lat, lng },
                            reportCount: reportsAfterEvent.length,
                            severityLevel: calculateSeverityLevel(reportsAfterEvent),
                            lastReported: formatDistanceToNow(new Date(newestReport.created_at), { addSuffix: true }),
                            description,
                            estimatedCleanupEffort: estimateCleanupEffort(reportsAfterEvent),
                            priority: calculatePriority(reportsAfterEvent),
                            reports: reportsAfterEvent,
                        });
                    }
                } else {
                    // No existing event - create single area for all reports
                    const mostRecentReport = groupReports.sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )[0];

                    const pollutionTypes = [...new Set(groupReports.map(r => r.pollutionType))];
                    const description = groupReports.length === 1
                        ? `${pollutionTypes[0]} pollution reported`
                        : `Multiple pollution types: ${pollutionTypes.join(', ')} (${groupReports.length} reports)`;

                    const baseLocation = mostRecentReport.address || `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

                    areas.push({
                        id: areaIdCounter++,
                        location: baseLocation,
                        coordinates: { lat, lng },
                        reportCount: groupReports.length,
                        severityLevel: calculateSeverityLevel(groupReports),
                        lastReported: formatDistanceToNow(new Date(mostRecentReport.created_at), { addSuffix: true }),
                        description,
                        estimatedCleanupEffort: estimateCleanupEffort(groupReports),
                        priority: calculatePriority(groupReports),
                        reports: groupReports,
                    });
                }
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

    const handleRefreshData = async () => {
        if (user?.id) {
            // First fetch events, then reports (reports processing depends on events)
            await fetchCreatedEvents();
        }
        await fetchReports();
    };

    useEffect(() => {
        const loadData = async () => {
            if (user?.id) {
                // First fetch events, then reports (reports processing depends on events)
                await fetchCreatedEvents();
            }
            await fetchReports();
        };

        loadData();
    }, [user?.id, token]);

    const handleViewReport = (report: Report) => {
        console.log('Viewing report:', report);
        // Functionality can be implemented later if needed
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
                await handleRefreshData();
                alert('Report declined successfully!');
            } else {
                throw new Error('Failed to decline report');
            }
        } catch (error) {
            console.error('Error declining report:', error);
            alert('Failed to decline report. Please try again.');
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
                await handleRefreshData();
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-waterbase-950 mb-2">
                        Organizer Portal
                    </h1>
                    <p className="text-sm sm:text-base text-waterbase-700 mb-4">
                        Manage cleanup events with location-based access control
                        {user?.areaOfResponsibility && (
                            <span className="block text-xs sm:text-sm mt-1">
                                📍 Your area of responsibility: <strong>{user.areaOfResponsibility}</strong>
                            </span>
                        )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <Badge variant="outline" className="bg-enviro-50 text-enviro-700 text-xs sm:text-sm px-2 py-1 h-auto">
                            {user?.role?.toUpperCase()} Access
                        </Badge>
                        {user?.organization && (
                            <Badge variant="outline" className="bg-waterbase-50 text-waterbase-700 text-xs sm:text-sm px-2 py-1 h-auto">
                                {user.organization}
                            </Badge>
                        )}
                        {user?.areaOfResponsibility && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs sm:text-sm px-2 py-1 h-auto">
                                Area: {user.areaOfResponsibility}
                            </Badge>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshData}
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
                    <TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
                        <TabsTrigger value="areas" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm h-auto min-h-[3rem] sm:min-h-[2.5rem]">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-center leading-tight">Reports</span>
                        </TabsTrigger>
                        <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm h-auto min-h-[3rem] sm:min-h-[2.5rem]">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-center leading-tight">My Events</span>
                        </TabsTrigger>
                        <TabsTrigger value="volunteers" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm h-auto min-h-[3rem] sm:min-h-[2.5rem]">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-center leading-tight">Volunteers </span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Reported Areas Tab */}
                    <TabsContent value="areas">
                        <SufficientReportsTab
                            eligibleAreas={eligibleAreas}
                            onSelectArea={(area) => {
                                setSelectedArea(area);
                                setShowAreaDetails(true);
                            }}
                            onRefresh={() => {
                                fetchReports();
                                fetchCreatedEvents();
                            }}
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
                    onDeclineReport={handleDeclineReport}
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
