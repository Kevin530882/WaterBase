import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Calendar,
    MapPin,
    Users,
    Plus,
    Award,
    Clock,
    Target,
    Camera,
    Edit,
    MessageSquare,
    Loader2,
    RefreshCw,
    XCircle,
    Play,
    CheckCircle,
    QrCode,
    Send,
    Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { QRCodeDialog } from "./QRCodeDialog";

export const MyEventsTab = ({
    createdEvents,
    isLoadingEvents,
    onEditEvent,
    onRefresh,
    onTabChange
}: {
    createdEvents: any[];
    isLoadingEvents: boolean;
    onEditEvent: (event: any) => void;
    onRefresh: () => void;
    onTabChange: (tab: string) => void;
}) => {
    const { token } = useAuth();
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [eventToCancel, setEventToCancel] = useState<any>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [qrEvent, setQrEvent] = useState<any>(null);

    const [messageDialogOpen, setMessageDialogOpen] = useState(false);
    const [messageEvent, setMessageEvent] = useState<any>(null);
    const [customMessage, setCustomMessage] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [eventToComplete, setEventToComplete] = useState<any>(null);
    const [isCompleting, setIsCompleting] = useState(false);

    const [isStarting, setIsStarting] = useState<number | null>(null);

    const sortedEvents = useMemo(() => {
        const statusOrder: Record<string, number> = {
            'recruiting': 1,
            'active': 2,
            'completed': 3,
            'cancelled': 4
        };

        return [...createdEvents].sort((a, b) => {
            const statusA = statusOrder[a.status] || 5;
            const statusB = statusOrder[b.status] || 5;

            if (statusA !== statusB) {
                return statusA - statusB;
            }

            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [createdEvents]);

    const handleStartEvent = async (event: any) => {
        if (!token) return;
        setIsStarting(event.id);
        try {
            const response = await fetch(`/api/events/${event.id}/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (response.ok) {
                setQrEvent(event);
                setQrDialogOpen(true);
                onRefresh();
            } else {
                alert(data.message || 'Failed to start event');
            }
        } catch (error) {
            console.error('Error starting event:', error);
            alert('Error starting event');
        } finally {
            setIsStarting(null);
        }
    };

    const handleCompleteEvent = async () => {
        if (!eventToComplete || !token) return;
        setIsCompleting(true);
        try {
            const response = await fetch(`/api/events/${eventToComplete.id}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.ok) {
                setCompleteDialogOpen(false);
                setEventToComplete(null);
                onRefresh();
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to complete event');
            }
        } catch (error) {
            console.error('Error completing event:', error);
            alert('Error completing event');
        } finally {
            setIsCompleting(false);
        }
    };

    const handleSendMessage = async (useCustom: boolean) => {
        if (!messageEvent || !token) return;
        setIsSendingMessage(true);
        try {
            const body: Record<string, string> = {};
            if (useCustom && customMessage.trim()) {
                body.message = customMessage.trim();
            }
            const response = await fetch(`/api/events/${messageEvent.id}/message-volunteers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (response.ok) {
                setMessageDialogOpen(false);
                setMessageEvent(null);
                setCustomMessage("");
                alert('Message sent successfully');
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message');
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleCancelEvent = async () => {
        if (!eventToCancel || !token) return;

        setIsCancelling(true);
        try {
            const response = await fetch(`/api/events/${eventToCancel.id}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setCancelDialogOpen(false);
                setEventToCancel(null);
                onRefresh();
            } else {
                alert('Failed to cancel event');
            }
        } catch (error) {
            console.error('Error cancelling event:', error);
            alert('Error cancelling event');
        } finally {
            setIsCancelling(false);
        }
    };

    const openCancelDialog = (event: any) => {
        setEventToCancel(event);
        setCancelDialogOpen(true);
    };

    const openCompleteDialog = (event: any) => {
        setEventToComplete(event);
        setCompleteDialogOpen(true);
    };

    const openMessageDialog = (event: any) => {
        setMessageEvent(event);
        setCustomMessage("");
        setMessageDialogOpen(true);
    };

    const openQrDialog = (event: any) => {
        setQrEvent(event);
        setQrDialogOpen(true);
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

    return (
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
                        onClick={onRefresh}
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
                            onClick={() => onTabChange("areas")}
                            className="bg-waterbase-500 hover:bg-waterbase-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Browse Eligible Areas
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {sortedEvents.map((event) => (
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
                                                    onClick={() => openMessageDialog(event)}
                                                >
                                                    <MessageSquare className="w-3 h-3 mr-1" />
                                                    Message Volunteers
                                                </Button>
                                                {(event.status === 'recruiting' || event.status === 'active') && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full text-xs"
                                                        onClick={() => openQrDialog(event)}
                                                    >
                                                        <QrCode className="w-3 h-3 mr-1" />
                                                        Show QR
                                                    </Button>
                                                )}
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
                                        {event.status === 'recruiting' && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-enviro-500 hover:bg-enviro-600 text-white"
                                                onClick={() => handleStartEvent(event)}
                                                disabled={isStarting === event.id}
                                            >
                                                {isStarting === event.id ? (
                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                ) : (
                                                    <Play className="w-4 h-4 mr-1" />
                                                )}
                                                Start Event
                                            </Button>
                                        )}
                                        {event.status === 'active' && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => openCompleteDialog(event)}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Complete Event
                                            </Button>
                                        )}
                                        {(event.status === 'recruiting' || event.status === 'active') && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onEditEvent(event)}
                                                >
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Edit Event
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => openCancelDialog(event)}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Cancel Event
                                                </Button>
                                            </>
                                        )}
                                        {event.status === 'cancelled' && (
                                            <Badge variant="outline" className="bg-red-100 text-red-800">
                                                Cancelled
                                            </Badge>
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

            {/* Cancel Event Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Event</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel &quot;{eventToCancel?.title}&quot;? This will notify all registered volunteers about the cancellation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setCancelDialogOpen(false)}
                            disabled={isCancelling}
                        >
                            Keep Event
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={handleCancelEvent}
                            disabled={isCancelling}
                        >
                            {isCancelling ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Cancel Event
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Complete Event Dialog */}
            <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Event</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to mark &quot;{eventToComplete?.title}&quot; as completed? All linked reports will be auto-resolved and badges will be awarded to attendees.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setCompleteDialogOpen(false)}
                            disabled={isCompleting}
                        >
                            Keep Active
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleCompleteEvent}
                            disabled={isCompleting}
                        >
                            {isCompleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Completing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Complete Event
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Message Volunteers Dialog */}
            <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Message Volunteers
                        </DialogTitle>
                        <DialogDescription>
                            Send a reminder or custom message to all volunteers for &quot;{messageEvent?.title}&quot;.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <Textarea
                            placeholder="Enter a custom message (optional)..."
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            rows={4}
                        />
                        <p className="text-xs text-gray-500">
                            Leave empty to send a pre-built reminder with event date, time, and location.
                        </p>
                    </div>

                    <div className="flex justify-end space-x-2 mt-2">
                        <Button
                            variant="outline"
                            onClick={() => setMessageDialogOpen(false)}
                            disabled={isSendingMessage}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSendMessage(false)}
                            disabled={isSendingMessage}
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Send Pre-built Reminder
                        </Button>
                        <Button
                            onClick={() => handleSendMessage(true)}
                            disabled={isSendingMessage || !customMessage.trim()}
                        >
                            {isSendingMessage ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            Send
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* QR Code Dialog */}
            <QRCodeDialog
                open={qrDialogOpen}
                onOpenChange={setQrDialogOpen}
                eventId={qrEvent?.id ?? null}
                eventTitle={qrEvent?.title}
                currentVolunteers={qrEvent?.currentVolunteers || 0}
            />
        </div>
    );
};
