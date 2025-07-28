import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface EditEventProps {
    isOpen: boolean;
    onClose: () => void;
    event: any | null;
    onSuccess: () => void;
}

export const EditEvent = ({ isOpen, onClose, event, onSuccess }: EditEventProps) => {
    const { token } = useAuth();
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Helper function to format date for input
    const formatDateForInput = (dateString: string) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
        } catch (error) {
            console.error('Date formatting error:', error);
            return "";
        }
    };

    // Helper function to format duration
    const formatDuration = (duration: any) => {
        if (!duration) return "";
        
        const durationNum = parseFloat(duration.toString());
        
        // Map common durations to select values
        if (durationNum === 2) return "2";
        if (durationNum === 3) return "3";
        if (durationNum === 4) return "4";
        if (durationNum === 6) return "6";
        if (durationNum === 12) return "12";
        
        // For other values, find the closest match or default to "3"
        if (durationNum <= 2.5) return "2";
        if (durationNum <= 3.5) return "3";
        if (durationNum <= 5) return "4";
        if (durationNum <= 9) return "6";
        if (durationNum >= 10) return "12";
        
        return "3"; // Default fallback
    };

    const [editEventData, setEditEventData] = useState({
        title: "",
        date: "",
        time: "",
        duration: "",
        maxVolunteers: "",
        description: "",
        rewardPoints: "",
        rewardBadge: "",
        status: "recruiting",
    });

    // Update form data when event prop changes - use useEffect instead of useState
    useEffect(() => {
        if (event) {
            console.log('Event data received:', event);
            console.log('Event duration:', event.duration);
            console.log('Formatted duration:', formatDuration(event.duration));
            
            setEditEventData({
                title: event.title || "",
                date: formatDateForInput(event.date),
                time: event.time || "",
                duration: formatDuration(event.duration),
                maxVolunteers: event.maxVolunteers?.toString() || "",
                description: event.description || "",
                rewardPoints: event.points?.toString() || "",
                rewardBadge: event.badge || "",
                status: event.status || "recruiting",
            });
        }
    }, [event]);

    const handleUpdateEvent = async () => {
        if (!event) return;

        try {
            setIsUpdating(true);

            const eventData = {
                title: editEventData.title,
                date: editEventData.date,
                time: editEventData.time,
                duration: parseFloat(editEventData.duration || "3.0"),
                maxVolunteers: parseInt(editEventData.maxVolunteers),
                description: editEventData.description,
                points: parseInt(editEventData.rewardPoints),
                badge: editEventData.rewardBadge,
                status: editEventData.status,
            };

            console.log('Updating event with data:', eventData);

            const response = await fetch(`/api/events/${event.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            if (response.ok) {
                onSuccess();
                onClose();
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
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClose = () => {
        onClose();
        setEditEventData({
            title: "",
            date: "",
            time: "",
            duration: "",
            maxVolunteers: "",
            description: "",
            rewardPoints: "",
            rewardBadge: "",
            status: "recruiting",
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Cleanup Event</DialogTitle>
                    <DialogDescription>
                        Update event details for {event?.title}
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
                            disabled={isUpdating}
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
                                disabled={isUpdating}
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
                                disabled={isUpdating}
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
                                disabled={isUpdating}
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
                                disabled={isUpdating}
                            />
                        </div>
                    </div>

                    {/* Rest of your form fields remain the same */}
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
                            disabled={isUpdating}
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
                            disabled={isUpdating}
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
                                disabled={isUpdating}
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
                                disabled={isUpdating}
                            />
                        </div>
                    </div>

                    <div className="flex space-x-2 pt-4">
                        <Button
                            onClick={handleUpdateEvent}
                            className="flex-1 bg-waterbase-500 hover:bg-waterbase-600"
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Updating...' : 'Update Event'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1"
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};