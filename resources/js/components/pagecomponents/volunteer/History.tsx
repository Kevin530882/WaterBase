import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { Calendar, MapPin, Loader2, Clock, } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { eventService, Event } from "@/services/eventService";

export const History = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState("events");
    const [volunteerHistory, setVolunteerHistory] = useState<Event[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        fetchVolunteerHistory();
    }, [token]);

    const fetchVolunteerHistory = async () => {
        if (!token) return;

        try {
            setIsLoadingHistory(true);
            const history = await eventService.getUserEvents(token);
            setVolunteerHistory(history);
        } catch (error) {
            console.error('Error fetching volunteer history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "completed":
                return "bg-green-500 text-white";
            case "active":
                return "bg-blue-500 text-white";
            case "recruiting":
                return "bg-yellow-500 text-black";
            case "cancelled":
                return "bg-red-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeString: string) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };
    
    return (
        <TabsContent value="history">
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-waterbase-950">
                    Volunteer History
                </h2>

                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mr-2 text-waterbase-500" />
                        <span className="text-waterbase-600">Loading your history...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {volunteerHistory.map((event) => (
                            <Card key={event.id} className="border-waterbase-200">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-waterbase-950 mb-2">
                                                {event.title}
                                            </h3>
                                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{formatDate(event.date)}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{formatTime(event.time)} ({event.duration}h)</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{event.address}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 mb-3">
                                                {event.description}
                                            </p>
                                            <div className="flex items-center space-x-4">
                                                <Badge className="bg-enviro-100 text-enviro-800">
                                                    +{event.points} points
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-yellow-50 text-yellow-800"
                                                >
                                                    {event.badge}
                                                </Badge>
                                                {event.pivot?.joined_at && (
                                                    <div className="text-xs text-gray-500">
                                                        Joined: {new Date(event.pivot.joined_at).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className={getStatusColor(event.status)}>
                                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {volunteerHistory.length === 0 && (
                            <Card className="border-waterbase-200">
                                <CardContent className="p-8 text-center">
                                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                        No events yet
                                    </h3>
                                    <p className="text-gray-500 mb-4">
                                        Join your first cleanup event to start making a difference!
                                    </p>
                                    <Button
                                        onClick={() => setActiveTab("events")}
                                        className="bg-waterbase-500 hover:bg-waterbase-600"
                                    >
                                        Browse Events
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </TabsContent>
    )
}