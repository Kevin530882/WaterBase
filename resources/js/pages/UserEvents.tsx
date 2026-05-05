import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { eventService, Event } from "@/services/eventService";
import { Loader2, ChevronLeft, MapPin, Calendar, Clock, Users, Zap, AlertCircle } from "lucide-react";

export const UserEvents = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchUserEvents();
  }, [token]);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, statusFilter]);

  const fetchUserEvents = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const userEvents = await eventService.getUserEvents(token);
      // Sort by date descending (most recent first)
      const sorted = userEvents.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEvents(sorted);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    if (searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    setFilteredEvents(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recruiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isEventPast = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-waterbase-950">My Event History</h1>
            <p className="text-waterbase-600 mt-1">View all your cleanup drives and events</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-waterbase-200">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-waterbase-700 block mb-2">
                  Search Events
                </label>
                <Input
                  placeholder="Search by title or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-waterbase-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-waterbase-700 block mb-2">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-waterbase-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="recruiting">Recruiting</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-waterbase-500" />
            <span className="text-waterbase-600">Loading your events...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="border-waterbase-200">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-waterbase-300" />
              <p className="text-waterbase-600 text-lg">No events found</p>
              <p className="text-waterbase-500 text-sm mt-2">
                {events.length === 0 ? "You haven't joined any events yet" : "Try adjusting your filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-waterbase-600">
              Showing {filteredEvents.length} of {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
            {filteredEvents.map((event) => (
              <Card key={event.id} className="border-waterbase-200 hover:border-waterbase-400 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-waterbase-950">
                          {event.title}
                        </h3>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-waterbase-600">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span>{event.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-waterbase-600">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-waterbase-600">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {formatTime(event.time)} ({event.duration} hour{event.duration !== 1 ? 's' : ''})
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-waterbase-600 mt-3">{event.description}</p>
                        )}
                      </div>

                      {/* Event Stats */}
                      <div className="mt-4 pt-4 border-t border-waterbase-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="flex items-center gap-1 text-waterbase-600 text-xs mb-1">
                              <Users className="w-4 h-4" />
                              <span>Volunteers</span>
                            </div>
                            <p className="font-semibold text-waterbase-950">
                              {event.currentVolunteers || 0}/{event.maxVolunteers}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-waterbase-600 text-xs mb-1">
                              <Zap className="w-4 h-4" />
                              <span>Points Earned</span>
                            </div>
                            <p className="font-semibold text-waterbase-950">{event.points} pts</p>
                          </div>
                          {event.badge && (
                            <div className="md:col-span-2">
                              <div className="text-waterbase-600 text-xs mb-1">Badge</div>
                              <p className="font-semibold text-waterbase-950">
                                {event.badge.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Creator Info */}
                      {event.creator && (
                        <div className="mt-4 pt-4 border-t border-waterbase-200">
                          <div className="text-sm">
                            <span className="text-waterbase-600">Organized by:</span>
                            <p className="font-medium text-waterbase-950 mt-1">
                              {event.creator.firstName} {event.creator.lastName}
                              {event.creator.organization && ` (${event.creator.organization})`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
