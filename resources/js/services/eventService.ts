import { useAuth } from "@/contexts/AuthContext";

export interface Event {
    id: number;
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    date: string;
    time: string;
    duration: number;
    description: string;
    maxVolunteers: number;
    currentVolunteers?: number;
    points: number;
    badge: string;
    status: 'recruiting' | 'active' | 'completed' | 'cancelled';
    user_id: number;
    created_at: string;
    updated_at: string;
    creator?: {
        firstName: string;
        lastName: string;
        organization?: string;
        role: string;
    };
    attendees?: any[];
}

export const eventService = {
    async getAllEvents(token: string): Promise<Event[]> {
        const response = await fetch('/api/events', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }

        return response.json();
    },

    async joinEvent(eventId: number, token: string): Promise<void> {
        const response = await fetch(`/api/events/${eventId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to join event');
        }

        return response.json();
    },

    async getUserEvents(token: string): Promise<Event[]> {
        const response = await fetch('/api/user/events', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user events');
        }

        return response.json();
    }
};