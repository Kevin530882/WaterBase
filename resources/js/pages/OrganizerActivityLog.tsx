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
import { Loader2, ChevronLeft, MapPin, Calendar, Clock, Users, AlertCircle, Award, CheckCircle } from "lucide-react";

interface Report {
  id: number;
  address: string;
  pollutionType: string;
  status: 'pending' | 'verified' | 'declined' | 'resolved';
  severityByUser: string;
  created_at: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface UserStats {
  eventsCreated?: number;
  eventsCompleted?: number;
  volunteersManaged?: number;
  accuracyRate?: number;
  badgesEarned?: number;
  badges?: string[];
}

export const OrganizerActivityLog = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  
  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  
  // Stats
  const [stats, setStats] = useState<UserStats>({});
  const [badgesIssuedCount, setBadgesIssuedCount] = useState(0);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'reports' | 'badges'>('events');

  useEffect(() => {
    fetchAllData();
  }, [token, user]);

  useEffect(() => {
    filterEvents();
  }, [events, eventSearchQuery, eventStatusFilter]);

  useEffect(() => {
    filterReports();
  }, [reports, reportSearchQuery, reportStatusFilter]);

  const fetchAllData = async () => {
    if (!token || !user) return;

    try {
      setIsLoading(true);
      
      // Fetch events created by this user
      const allEvents = await eventService.getAllEvents(token);
      const userEvents = allEvents.filter((e) => e.user_id === user.id);
      const sorted = userEvents.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEvents(sorted);

      // Count badges issued (volunteers who earned badges from their events)
      let badgeCount = 0;
      for (const event of sorted) {
        try {
          const volunteersRes = await fetch(`/api/events/${event.id}/volunteers`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (volunteersRes.ok) {
            const volunteers = await volunteersRes.json();
            badgeCount += volunteers.filter((v: any) => v.badge).length;
          }
        } catch (e) {
          console.error(`Error fetching volunteers for event ${event.id}:`, e);
        }
      }
      setBadgesIssuedCount(badgeCount);

      // Fetch reports from their area
      if (user.areaOfResponsibility) {
        try {
          const reportsRes = await fetch(`/api/reports/area/${encodeURIComponent(user.areaOfResponsibility)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (reportsRes.ok) {
            setReports(await reportsRes.json());
          }
        } catch (e) {
          console.error('Error fetching area reports:', e);
        }
      }

      // Fetch stats
      const statsRes = await fetch('/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    if (eventSearchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
          e.address.toLowerCase().includes(eventSearchQuery.toLowerCase())
      );
    }

    if (eventStatusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === eventStatusFilter);
    }

    setFilteredEvents(filtered);
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (reportSearchQuery) {
      filtered = filtered.filter(
        (r) => r.address.toLowerCase().includes(reportSearchQuery.toLowerCase())
      );
    }

    if (reportStatusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === reportStatusFilter);
    }

    setFilteredReports(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-blue-100 text-blue-800';
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

  const getPollutionTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const renderEventsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-waterbase-700 block mb-2">Search Events</label>
          <Input
            placeholder="Search by title or location..."
            value={eventSearchQuery}
            onChange={(e) => setEventSearchQuery(e.target.value)}
            className="border-waterbase-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-waterbase-700 block mb-2">Status</label>
          <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
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

      {filteredEvents.length === 0 ? (
        <Card className="border-waterbase-200">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-waterbase-300" />
            <p className="text-waterbase-600">No events found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="border-waterbase-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-waterbase-950">{event.title}</h3>
                      <Badge className={getStatusColor(event.status)}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-waterbase-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.date)} at {formatTime(event.time)}</span>
                      </div>
                      {event.description && (
                        <p className="text-waterbase-600 mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-waterbase-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-waterbase-600 text-xs mb-1">
                      <Users className="w-3 h-3" />
                      <span>Volunteers</span>
                    </div>
                    <p className="font-semibold text-sm">{event.currentVolunteers || 0}/{event.maxVolunteers}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-waterbase-600 text-xs mb-1">
                      <Clock className="w-3 h-3" />
                      <span>Duration</span>
                    </div>
                    <p className="font-semibold text-sm">{event.duration}h</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-waterbase-600 text-xs mb-1">
                      <Award className="w-3 h-3" />
                      <span>Points</span>
                    </div>
                    <p className="font-semibold text-sm">{event.points}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-waterbase-700 block mb-2">Search Location</label>
          <Input
            placeholder="Search by address..."
            value={reportSearchQuery}
            onChange={(e) => setReportSearchQuery(e.target.value)}
            className="border-waterbase-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-waterbase-700 block mb-2">Status</label>
          <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
            <SelectTrigger className="border-waterbase-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <Card className="border-waterbase-200">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-waterbase-300" />
            <p className="text-waterbase-600">
              {user?.areaOfResponsibility 
                ? "No reports found in your area" 
                : "Set your area of responsibility to see reports"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <Card key={report.id} className="border-waterbase-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-waterbase-950">
                        {getPollutionTypeLabel(report.pollutionType)}
                      </h3>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-waterbase-600 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span>{report.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-waterbase-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(report.created_at)}</span>
                    </div>
                    {report.user && (
                      <div className="text-xs text-waterbase-500 mt-2">
                        Submitted by {report.user.firstName} {report.user.lastName}
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
  );

  const renderBadgesTab = () => (
    <div className="space-y-4">
      <Card className="border-waterbase-200">
        <CardContent className="p-6">
          <div className="text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <div className="text-3xl font-bold text-waterbase-950">{badgesIssuedCount}</div>
            <p className="text-waterbase-600 mt-2">Badges Issued to Volunteers</p>
            <p className="text-sm text-waterbase-500 mt-4">
              Volunteers earn badges by completing your events. This count shows how many badges have been issued from your cleanup drives.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-waterbase-50">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-waterbase-500" />
          <span className="text-waterbase-600">Loading activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-waterbase-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-waterbase-950">My Activity Log</h1>
            <p className="text-waterbase-600 mt-1">Manage your events and monitor your area</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-waterbase-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-waterbase-950">{stats.eventsCreated || 0}</div>
              <div className="text-sm text-waterbase-600">Events Created</div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-waterbase-950">{stats.eventsCompleted || 0}</div>
              <div className="text-sm text-waterbase-600">Events Completed</div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-waterbase-950">{stats.volunteersManaged || 0}</div>
              <div className="text-sm text-waterbase-600">Volunteers Managed</div>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-waterbase-950">{badgesIssuedCount}</div>
              <div className="text-sm text-waterbase-600">Badges Issued</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-waterbase-200">
          <Button
            variant={activeTab === 'events' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('events')}
            className="rounded-none border-b-2"
          >
            Events ({events.length})
          </Button>
          <Button
            variant={activeTab === 'reports' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('reports')}
            className="rounded-none border-b-2"
          >
            Area Reports ({reports.length})
          </Button>
          <Button
            variant={activeTab === 'badges' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('badges')}
            className="rounded-none border-b-2"
          >
            Badges Issued
          </Button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'events' && renderEventsTab()}
          {activeTab === 'reports' && renderReportsTab()}
          {activeTab === 'badges' && renderBadgesTab()}
        </div>
      </div>
    </div>
  );
};
