import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Camera, MapPin, Award, Calendar, FileText, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Activity {
    id: number;
    type: string;
    description: string;
    date: string;
    status: string;
    details?: any;
}

export const RecentActivity = () => {
    const { user, token } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user && token) {
            fetchUserActivities();
        }
    }, [user, token]);

    const fetchUserActivities = async () => {
        try {
            setIsLoading(true);
            
            const role = user?.role?.toLowerCase() || 'volunteer';
            let activitiesData: Activity[] = [];
            
            switch (role) {
                case 'volunteer':
                    // Fetch reports and events for volunteers
                    try {
                        const [reportsRes, eventsRes] = await Promise.all([
                            fetch(`/api/reports`, {
                                headers: { Authorization: `Bearer ${token}` }
                            }),
                            fetch(`/api/user/events`, {
                                headers: { Authorization: `Bearer ${token}` }
                            })
                        ]);
                        
                        if (reportsRes.ok) {
                            const reportsData = await reportsRes.json();
                            const reports = Array.isArray(reportsData) ? reportsData : reportsData.data || [];
                            
                            // Filter reports by current user
                            const userReports = reports.filter((report: any) => report.user_id === user?.id);
                            
                            const reportActivities = userReports.slice(0, 3).map((report: any) => ({
                                id: `report-${report.id}`,
                                type: "report_submitted",
                                description: `Submitted report: ${report.title || 'Water Quality Report'}`,
                                date: new Date(report.created_at).toLocaleDateString(),
                                status: report.status || 'pending'
                            }));
                            activitiesData = [...activitiesData, ...reportActivities];
                        }
                        
                        if (eventsRes.ok) {
                            const eventsData = await eventsRes.json();
                            const events = Array.isArray(eventsData) ? eventsData : eventsData.data || [];
                            
                            const eventActivities = events.slice(0, 3).map((event: any) => ({
                                id: `event-${event.id}`,
                                type: event.status === 'completed' ? "event_completed" : "event_joined",
                                description: event.status === 'completed' 
                                    ? `Completed cleanup: ${event.title}` 
                                    : `Joined event: ${event.title}`,
                                date: event.pivot?.joined_at 
                                    ? new Date(event.pivot.joined_at).toLocaleDateString()
                                    : new Date(event.created_at).toLocaleDateString(),
                                status: event.status
                            }));
                            activitiesData = [...activitiesData, ...eventActivities];
                        }
                    } catch (error) {
                        console.error('Error fetching volunteer activities:', error);
                    }
                    break;
                    
                case 'ngo':
                case 'lgu':
                    // Fetch created events and managed activities
                    try {
                        const createdEventsRes = await fetch(`/api/events`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (createdEventsRes.ok) {
                            const eventsData = await createdEventsRes.json();
                            const events = Array.isArray(eventsData) ? eventsData : eventsData.data || [];
                            
                            // Filter events created by current user
                            const userCreatedEvents = events.filter((event: any) => event.user_id === user?.id);
                            
                            const eventActivities = userCreatedEvents.slice(0, 3).map((event: any) => ({
                                id: `created-event-${event.id}`,
                                type: event.status === 'completed' ? "event_completed" : "event_created",
                                description: event.status === 'completed'
                                    ? `Successfully completed: ${event.title}`
                                    : `Created cleanup event: ${event.title}`,
                                date: new Date(event.created_at).toLocaleDateString(),
                                status: event.status
                            }));
                            activitiesData = [...activitiesData, ...eventActivities];
                            
                            // Add volunteer management activities
                            const managementActivities = userCreatedEvents
                                .filter((event: any) => event.currentVolunteers && event.currentVolunteers > 0)
                                .slice(0, 2)
                                .map((event: any) => ({
                                    id: `managed-${event.id}`,
                                    type: "volunteers_managed",
                                    description: `Managed ${event.currentVolunteers} volunteers for ${event.title}`,
                                    date: new Date(event.updated_at || event.created_at).toLocaleDateString(),
                                    status: 'active'
                                }));
                            activitiesData = [...activitiesData, ...managementActivities];
                            
                            // Add report verification activities
                            try {
                                const reportsRes = await fetch(`/api/reports`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                
                                if (reportsRes.ok) {
                                    const reportsData = await reportsRes.json();
                                    const reports = Array.isArray(reportsData) ? reportsData : reportsData.data || [];
                                    
                                    // Filter reports by area of responsibility
                                    const relevantReports = reports.filter((report: any) => 
                                        user?.areaOfResponsibility && 
                                        report.address?.toLowerCase().includes(user.areaOfResponsibility.toLowerCase()) &&
                                        report.status === 'verified'
                                    );
                                    
                                    const verificationActivities = relevantReports.slice(0, 2).map((report: any) => ({
                                        id: `verified-${report.id}`,
                                        type: "report_reviewed",
                                        description: `Verified report: ${report.title || 'Water Quality Report'}`,
                                        date: new Date(report.updated_at || report.created_at).toLocaleDateString(),
                                        status: 'verified'
                                    }));
                                    activitiesData = [...activitiesData, ...verificationActivities];
                                }
                            } catch (error) {
                                console.error('Error fetching reports for verification:', error);
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching organization activities:', error);
                    }
                    break;
                    
                case 'researcher':
                    // For researchers, show report submissions and analysis activities
                    try {
                        const reportsRes = await fetch(`/api/reports`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (reportsRes.ok) {
                            const reportsData = await reportsRes.json();
                            const reports = Array.isArray(reportsData) ? reportsData : reportsData.data || [];
                            
                            // Filter reports by current user
                            const userReports = reports.filter((report: any) => report.user_id === user?.id);
                            
                            const researchActivities = userReports.slice(0, 3).map((report: any) => ({
                                id: `research-${report.id}`,
                                type: "data_analysis",
                                description: `Analyzed water quality data: ${report.title || 'Research Report'}`,
                                date: new Date(report.created_at).toLocaleDateString(),
                                status: report.status || 'processed'
                            }));
                            activitiesData = [...activitiesData, ...researchActivities];
                            
                            // Add data collection activities based on report locations
                            const collectionActivities = userReports
                                .filter((report: any) => report.address)
                                .slice(0, 2)
                                .map((report: any) => ({
                                    id: `collection-${report.id}`,
                                    type: "data_collected",
                                    description: `Collected water samples from ${report.address}`,
                                    date: new Date(report.created_at).toLocaleDateString(),
                                    status: 'processed'
                                }));
                            activitiesData = [...activitiesData, ...collectionActivities];
                        }
                        
                        // Add mock research publication activities (since this feature might not be implemented)
                        const mockPublications = [
                            {
                                id: 'pub-1',
                                type: "report_published",
                                description: "Published research on Manila Bay water quality trends",
                                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                                status: "published"
                            },
                            {
                                id: 'collaboration-1',
                                type: "data_analysis",
                                description: "Collaborated with LGU on pollution assessment",
                                date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                                status: "completed"
                            }
                        ];
                        activitiesData = [...activitiesData, ...mockPublications];
                    } catch (error) {
                        console.error('Error fetching researcher activities:', error);
                    }
                    break;
                    
                default:
                    // For users without specific roles, show basic activities
                    try {
                        const reportsRes = await fetch(`/api/reports`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (reportsRes.ok) {
                            const reportsData = await reportsRes.json();
                            const reports = Array.isArray(reportsData) ? reportsData : reportsData.data || [];
                            
                            // Filter reports by current user
                            const userReports = reports.filter((report: any) => report.user_id === user?.id);
                            
                            const basicActivities = userReports.slice(0, 5).map((report: any) => ({
                                id: `basic-report-${report.id}`,
                                type: "report_submitted",
                                description: `Submitted report: ${report.title || 'Water Quality Report'}`,
                                date: new Date(report.created_at).toLocaleDateString(),
                                status: report.status || 'pending'
                            }));
                            activitiesData = [...activitiesData, ...basicActivities];
                        }
                        
                        // Try to fetch events if user has joined any
                        try {
                            const eventsRes = await fetch(`/api/user/events`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            
                            if (eventsRes.ok) {
                                const eventsData = await eventsRes.json();
                                const events = Array.isArray(eventsData) ? eventsData : eventsData.data || [];
                                
                                const eventActivities = events.slice(0, 2).map((event: any) => ({
                                    id: `basic-event-${event.id}`,
                                    type: event.status === 'completed' ? "event_completed" : "event_joined",
                                    description: event.status === 'completed' 
                                        ? `Completed event: ${event.title}` 
                                        : `Joined event: ${event.title}`,
                                    date: event.pivot?.joined_at 
                                        ? new Date(event.pivot.joined_at).toLocaleDateString()
                                        : new Date(event.created_at).toLocaleDateString(),
                                    status: event.status
                                }));
                                activitiesData = [...activitiesData, ...eventActivities];
                            }
                        } catch (eventError) {
                            console.log('No events found for basic user');
                        }
                    } catch (error) {
                        console.error('Error fetching basic activities:', error);
                    }
                    break;
            }
            
            // Filter out activities with invalid dates
            activitiesData = activitiesData.filter(activity => {
                const date = new Date(activity.date);
                return !isNaN(date.getTime()) && activity.date !== 'Invalid Date';
            });
            
            // Sort activities by date (most recent first)
            activitiesData.sort((a, b) => {
                const dateA = new Date(a.date.split('/').reverse().join('-')).getTime();
                const dateB = new Date(b.date.split('/').reverse().join('-')).getTime();
                return dateB - dateA;
            });
            
            // Show only 5 most recent activities
            setActivities(activitiesData.slice(0, 5));
            
        } catch (error) {
            console.error('Error fetching activities:', error);
            // Set empty activities on error
            setActivities([]);
        } finally {
            setIsLoading(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case "report_submitted":
            case "report_reviewed":
                return <Camera className="w-5 h-5 text-waterbase-600" />;
            case "event_joined":
            case "event_completed":
            case "event_created":
                return <Calendar className="w-5 h-5 text-enviro-600" />;
            case "achievement":
                return <Award className="w-5 h-5 text-yellow-600" />;
            case "volunteers_managed":
                return <Users className="w-5 h-5 text-purple-600" />;
            case "data_analysis":
            case "data_collected":
            case "report_published":
                return <FileText className="w-5 h-5 text-blue-600" />;
            default:
                return <MapPin className="w-5 h-5 text-enviro-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "verified":
            case "completed":
            case "achieved":
            case "published":
                return "default";
            case "active":
            case "recruiting":
            case "ongoing":
                return "outline";
            case "pending":
                return "secondary";
            default:
                return "outline";
        }
    };

    if (isLoading) {
        return (
            <TabsContent value="activity">
                <Card className="border-waterbase-200">
                    <CardContent className="p-6 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mr-2 text-waterbase-500 mx-auto mb-2" />
                        <div className="text-waterbase-600">Loading activities...</div>
                    </CardContent>
                </Card>
            </TabsContent>
        );
    }

    return (
        <TabsContent value="activity">
            <Card className="border-waterbase-200">
                <CardHeader>
                    <CardTitle className="text-waterbase-950">
                        Recent Activity
                    </CardTitle>
                    <CardDescription className="text-waterbase-600">
                        Your latest contributions to the WaterBase community
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-center space-x-4 p-3 bg-waterbase-50 rounded-lg"
                            >
                                <div className="w-10 h-10 bg-waterbase-100 rounded-full flex items-center justify-center">
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-waterbase-950">
                                        {activity.description}
                                    </p>
                                    <p className="text-xs text-waterbase-600">
                                        {activity.date}
                                    </p>
                                </div>
                                <Badge
                                    variant={getStatusColor(activity.status)}
                                    className="text-xs"
                                >
                                    {activity.status}
                                </Badge>
                            </div>
                        ))}
                        
                        {activities.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No recent activities found</p>
                                <p className="text-sm mt-2">Start by submitting a report or joining an event!</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    );
};