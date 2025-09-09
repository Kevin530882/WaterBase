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
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    Gift,
    Search,
    Filter,
    CheckCircle,
    Heart,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { eventService, Event } from "@/services/eventService";

export const Events = () => {
    const { token } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [showJoinDialog, setShowJoinDialog] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [joinedEventIds, setJoinedEventIds] = useState<number[]>([]);

    // Fetch events on component mount
    useEffect(() => {
        fetchEvents();
        fetchJoinedEvents();
    }, [token]);

    // Add function to fetch joined events
    const fetchJoinedEvents = async () => {
        if (!token) return;

        try {
            const joinedEvents = await eventService.getUserEvents(token);
            const joinedIds = joinedEvents.map(event => event.id);
            setJoinedEventIds(joinedIds);
        } catch (error) {
            console.error('Error fetching joined events:', error);
        }
    };

    const fetchEvents = async () => {
        if (!token) return;

        try {
            setIsLoading(true);
            setError("");
            const eventsData = await eventService.getAllEvents(token);
            
            // Filter only recruiting and active events for volunteers
            const availableEvents = eventsData.filter(event => 
                event.status === 'recruiting' || event.status === 'active'
            );
            
            setEvents(availableEvents);
        } catch (error) {
            console.error('Error fetching events:', error);
            setError('Failed to load events. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter events based on search query
    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
    );


    const getOrganizerType = (role: string) => {
        switch (role) {
            case 'ngo':
                return 'NGO';
            case 'lgu':
                return 'LGU';
            case 'researcher':
                return 'Researcher';
            default:
                return 'Organizer';
        }
    };

    const handleJoinEvent = async () => {
        if (!selectedEvent || !token) return;

        try {
            setIsJoining(true);
            setError("");
            
            await eventService.joinEvent(selectedEvent.id, token);
            
            // Add the event ID to joined events
            setJoinedEventIds(prev => [...prev, selectedEvent.id]);
            
            setSuccess(`Successfully joined ${selectedEvent.title}!`);
            setShowJoinDialog(false);
            setSelectedEvent(null);
            
            // Refresh events to update volunteer count
            await fetchEvents();
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(""), 3000);
        } catch (error) {
            console.error('Error joining event:', error);
            setError(error instanceof Error ? error.message : 'Failed to join event');
        } finally {
            setIsJoining(false);
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

    const hasJoinedEvent = (eventId: number) => {
        return joinedEventIds.includes(eventId);
    };

    return (
        <TabsContent value="events">
            <div className="space-y-6">
                {/* Success/Error Messages */}
                {success && (
                    <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700">
                            {success}
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Search and Filters */}
                <div className="flex items-center space-x-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search cleanup events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button variant="outline">
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </Button>
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-waterbase-950">
                        Upcoming Cleanup Events
                    </h2>
                    <Badge className="bg-waterbase-500 text-white">
                        {filteredEvents.length} events available
                    </Badge>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-waterbase-500 mr-3" />
                        <span className="text-waterbase-600">Loading events...</span>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <Card className="border-waterbase-200">
                        <CardContent className="p-8 text-center">
                            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Events Available
                            </h3>
                            <p className="text-gray-600">
                                {searchQuery ? 'No events match your search.' : 'No cleanup events are currently available.'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredEvents.map((event) => (
                            <Card
                                key={event.id}
                                className="border-waterbase-200 hover:shadow-lg transition-shadow"
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg text-waterbase-950 mb-2">
                                                {event.title}
                                            </CardTitle>
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Badge variant="outline" className="text-xs bg-gray-50">
                                                    {getOrganizerType(event.creator?.role || '')}
                                                </Badge>
                                                <span className="text-sm text-gray-600">
                                                    {event.creator?.organization || 
                                                     `${event.creator?.firstName} ${event.creator?.lastName}`}
                                                </span>
                                            </div>
                                            <CardDescription>{event.description}</CardDescription>
                                        </div>
                                        <div className="flex flex-col items-end space-y-1">
                                            <Badge className={cn("text-xs", 
                                                event.status === 'recruiting' ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                                            )}>
                                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    {/* Event Details */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center space-x-2">
                                            <MapPin className="w-4 h-4 text-waterbase-600" />
                                            <span className="truncate">{event.address}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-4 h-4 text-waterbase-600" />
                                            <span>{formatDate(event.date)}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-waterbase-600" />
                                            <span>
                                                {formatTime(event.time)} ({event.duration}h)
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Users className="w-4 h-4 text-waterbase-600" />
                                            <span>
                                                {event.maxVolunteers - (event.currentVolunteers || 0)} spots left
                                            </span>
                                        </div>
                                    </div>

                                    {/* Volunteer Progress */}
                                    <div>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span>Volunteers</span>
                                            <span>
                                                {event.currentVolunteers || 0}/{event.maxVolunteers}
                                            </span>
                                        </div>
                                        <Progress
                                            value={((event.currentVolunteers || 0) / event.maxVolunteers) * 100}
                                            className="h-2"
                                        />
                                    </div>

                                    {/* Rewards Preview */}
                                    <div className="bg-gradient-to-r from-enviro-50 to-waterbase-50 p-3 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium flex items-center">
                                                <Gift className="w-4 h-4 mr-1" />
                                                Rewards
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <strong>{event.points}</strong> points
                                            </div>
                                            <div>{event.badge} badge</div>
                                        </div>
                                    </div>

                                    {/* Join Button */}
                                    {hasJoinedEvent(event.id) ? (
                                        <Button
                                            className="w-full bg-green-500 hover:bg-green-500 cursor-default"
                                            disabled
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Joined
                                        </Button>
                                    ) : (
                                        <Dialog
                                            open={showJoinDialog && selectedEvent?.id === event.id}
                                            onOpenChange={setShowJoinDialog}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                                                    onClick={() => setSelectedEvent(event)}
                                                    disabled={event.maxVolunteers <= (event.currentVolunteers || 0)}
                                                >
                                                    <Heart className="w-4 h-4 mr-2" />
                                                    {event.maxVolunteers <= (event.currentVolunteers || 0) 
                                                        ? 'Event Full' 
                                                        : 'Join This Cleanup'
                                                    }
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Join Cleanup Event</DialogTitle>
                                                    <DialogDescription>
                                                        Confirm your participation in {selectedEvent?.title}
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-4">
                                                    <div className="bg-waterbase-50 p-4 rounded-lg">
                                                        <h4 className="font-medium mb-2">Event Details</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <div>
                                                                <strong>Date:</strong> {selectedEvent && formatDate(selectedEvent.date)}
                                                            </div>
                                                            <div>
                                                                <strong>Time:</strong> {selectedEvent && formatTime(selectedEvent.time)}
                                                            </div>
                                                            <div>
                                                                <strong>Duration:</strong> {selectedEvent?.duration} hours
                                                            </div>
                                                            <div>
                                                                <strong>Location:</strong> {selectedEvent?.address}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                                        <h4 className="font-medium mb-2">You'll Receive</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <div>🏆 {selectedEvent?.points} points</div>
                                                            <div>🏅 {selectedEvent?.badge} badge</div>
                                                            <div>📜 Official participation certificate</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex space-x-2">
                                                        <Button
                                                            onClick={handleJoinEvent}
                                                            className="flex-1 bg-waterbase-500 hover:bg-waterbase-600"
                                                            disabled={isJoining}
                                                        >
                                                            {isJoining ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                    Joining...
                                                                </>
                                                            ) : (
                                                                'Confirm Participation'
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setShowJoinDialog(false)}
                                                            className="flex-1"
                                                            disabled={isJoining}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </TabsContent>
    );
};