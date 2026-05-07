import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Users,
    CheckCircle,
    Loader2,
    AlertCircle,
    Trophy,
    Star,
    RefreshCw,
    LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Volunteer {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    totalEvents: number;
    totalPoints: number;
    eventsThisMonth: number;
    totalHours: number;
    lastActivity: string;
    status: 'active' | 'inactive';
    joinDate: string;
    badges: string[];
    rank: string;
    currentEvents: any[];
}

interface VolunteerStats {
    totalVolunteers: number;
    activeThisMonth: number;
    totalPointsAwarded: number;
    averageEventsPerVolunteer: number;
    topVolunteers: Volunteer[];
}

export const VolunteerManagementTab = () => {
    const { token, user } = useAuth();
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [stats, setStats] = useState<VolunteerStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [orgMembers, setOrgMembers] = useState<Array<{
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        profile_photo?: string;
        role: string;
        joined_at: string;
        joined_via: string;
    }>>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [membersError, setMembersError] = useState("");
    const [isRemovingMember, setIsRemovingMember] = useState<number | null>(null); const fetchVolunteers = async () => {
        if (!token || !user?.id) {
            setError("User not authenticated");
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            // Try to fetch organizer's events and extract volunteers
            const eventsResponse = await fetch(`/api/events?user_id=${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (eventsResponse.ok) {
                const events = await eventsResponse.json();
                console.log('Fetched events:', events);

                // Extract volunteers from events
                const volunteerMap = new Map<number, Volunteer>();

                for (const event of events) {
                    console.log('Processing event:', event);

                    // Try to fetch volunteers from the new endpoint
                    try {
                        const volunteersResponse = await fetch(`/api/events/${event.id}/volunteers`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/json',
                            },
                        });

                        if (volunteersResponse.ok) {
                            const eventVolunteers = await volunteersResponse.json();
                            console.log(`Volunteers for event ${event.id}:`, eventVolunteers);

                            eventVolunteers.forEach((eventVolunteer: any) => {
                                const userId = eventVolunteer.user_id || eventVolunteer.id;

                                if (!volunteerMap.has(userId)) {
                                    // Create new volunteer record from REAL data - no made up names!
                                    const volunteer: Volunteer = {
                                        id: userId,
                                        firstName: eventVolunteer.firstName || 'Unknown',
                                        lastName: eventVolunteer.lastName || 'Volunteer',
                                        email: eventVolunteer.email || 'no-email@provided.com',
                                        phone: eventVolunteer.phone || eventVolunteer.phoneNumber || '',
                                        address: eventVolunteer.organization || '',
                                        totalEvents: 0,
                                        totalPoints: 0,
                                        eventsThisMonth: 0,
                                        totalHours: 0,
                                        lastActivity: event.date || event.created_at,
                                        status: 'active' as const,
                                        joinDate: eventVolunteer.pivot?.created_at || eventVolunteer.joined_at || event.created_at,
                                        badges: ['Environmental Volunteer'],
                                        rank: 'Active',
                                        currentEvents: []
                                    };
                                    volunteerMap.set(userId, volunteer);
                                }

                                // Update volunteer stats
                                const volunteer = volunteerMap.get(userId)!;
                                volunteer.totalEvents++;
                                volunteer.totalPoints += event.points || 50;
                                volunteer.totalHours += parseInt(event.duration) || 3;

                                // Check if event is this month
                                const eventDate = new Date(event.date);
                                const now = new Date();
                                if (eventDate.getMonth() === now.getMonth() &&
                                    eventDate.getFullYear() === now.getFullYear()) {
                                    volunteer.eventsThisMonth++;
                                }

                                // Update last activity
                                const eventEndDate = new Date(event.date);
                                const lastActivityDate = new Date(volunteer.lastActivity);
                                if (eventEndDate > lastActivityDate) {
                                    volunteer.lastActivity = event.date;
                                }
                            });
                        } else {
                            console.log(`No volunteers found for event ${event.id}, status:`, volunteersResponse.status);
                        }
                    } catch (volunteerError) {
                        console.log(`Could not fetch volunteers for event ${event.id}:`, volunteerError);
                    }
                }

                const volunteersArray = Array.from(volunteerMap.values());
                console.log('Final volunteers array:', volunteersArray);

                // Update last activity to relative time
                volunteersArray.forEach(volunteer => {
                    const lastActivityDate = new Date(volunteer.lastActivity);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - lastActivityDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) volunteer.lastActivity = '1 day ago';
                    else if (diffDays <= 7) volunteer.lastActivity = `${diffDays} days ago`;
                    else if (diffDays <= 30) volunteer.lastActivity = `${Math.ceil(diffDays / 7)} weeks ago`;
                    else volunteer.lastActivity = `${Math.ceil(diffDays / 30)} months ago`;

                    // Update status based on recent activity
                    volunteer.status = diffDays <= 30 ? 'active' : 'inactive';
                });

                setVolunteers(volunteersArray);

                // Calculate stats
                const activeThisMonth = volunteersArray.filter(v => v.eventsThisMonth > 0).length;
                const totalPointsAwarded = volunteersArray.reduce((sum, v) => sum + v.totalPoints, 0);
                const averageEvents = volunteersArray.length > 0
                    ? volunteersArray.reduce((sum, v) => sum + v.totalEvents, 0) / volunteersArray.length
                    : 0;
                const topVolunteers = [...volunteersArray]
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .slice(0, 5);

                setStats({
                    totalVolunteers: volunteersArray.length,
                    activeThisMonth,
                    totalPointsAwarded,
                    averageEventsPerVolunteer: Math.round(averageEvents * 10) / 10,
                    topVolunteers
                });

            } else {
                const errorText = await eventsResponse.text();
                console.error('API Error:', eventsResponse.status, errorText);
                setError(`Failed to fetch events (${eventsResponse.status}). Please try again.`);
            }
        } catch (error) {
            console.error('Error fetching volunteers:', error);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        return status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white';
    };

    const filteredVolunteers = volunteers
        .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()); // Sort latest to oldest

    const fetchOrgMembers = async () => {
        if (!token || !user?.id) {
            setMembersError("User not authenticated");
            return;
        }
        try {
            setIsLoadingMembers(true);
            setMembersError("");
            const response = await fetch(`/api/organizations/${user.id}/members`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });
            if (response.ok) {
                const data = await response.json();
                setOrgMembers(data.data || []);
            } else {
                const text = await response.text();
                console.error('Failed to fetch org members:', response.status, text);
                setMembersError(`Failed to fetch members (${response.status}).`);
            }
        } catch (err: any) {
            console.error('Error fetching org members:', err);
            setMembersError('Network error loading members.');
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const handleRemoveMember = async (memberId: number) => {
        if (!token || !user?.id || isRemovingMember !== null) return;
        if (!confirm('Are you sure you want to remove this member from your organization?')) return;
        try {
            setIsRemovingMember(memberId);
            const response = await fetch(`/api/organizations/${user.id}/members/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });
            if (response.ok) {
                setOrgMembers((prev) => prev.filter((m) => m.id !== memberId));
            } else {
                const data = await response.json().catch(() => ({}));
                alert(data.message || 'Failed to remove member');
            }
        } catch (err: any) {
            alert(err.message || 'Failed to remove member');
        } finally {
            setIsRemovingMember(null);
        }
    };

    useEffect(() => {
        fetchVolunteers();
        fetchOrgMembers();
    }, [token, user?.id]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
                    <p className="text-waterbase-600">Loading volunteer data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-waterbase-950">
                    Volunteer Management
                </h2>
                <Button
                    onClick={fetchVolunteers}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {error && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error}
                        <br />
                        <span className="text-sm text-gray-600">
                            This feature will be fully functional once the participant tracking system is implemented.
                        </span>
                    </AlertDescription>
                </Alert>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-waterbase-200">
                    <CardContent className="p-6 text-center">
                        <Users className="w-12 h-12 text-waterbase-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-waterbase-950">
                            {stats?.totalVolunteers || 0}
                        </h3>
                        <p className="text-waterbase-600">Total Volunteers</p>
                    </CardContent>
                </Card>

                <Card className="border-waterbase-200">
                    <CardContent className="p-6 text-center">
                        <CheckCircle className="w-12 h-12 text-enviro-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-waterbase-950">
                            {stats?.activeThisMonth || 0}
                        </h3>
                        <p className="text-waterbase-600">Active This Month</p>
                    </CardContent>
                </Card>

                <Card className="border-waterbase-200">
                    <CardContent className="p-6 text-center">
                        <Star className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-waterbase-950">
                            {stats?.totalPointsAwarded?.toLocaleString() || 0}
                        </h3>
                        <p className="text-waterbase-600">Points Awarded</p>
                    </CardContent>
                </Card>

                <Card className="border-waterbase-200">
                    <CardContent className="p-6 text-center">
                        <Trophy className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-waterbase-950">
                            {stats?.averageEventsPerVolunteer || 0}
                        </h3>
                        <p className="text-waterbase-600">Avg Events per Volunteer</p>
                    </CardContent>
                </Card>
            </div>

            {/* Organization Members */}
            <Card className="border-waterbase-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Organization Members</CardTitle>
                            <CardDescription>Members who have joined your organization</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchOrgMembers} disabled={isLoadingMembers}>
                            <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingMembers && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {membersError && (
                        <Alert className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{membersError}</AlertDescription>
                        </Alert>
                    )}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead>Via</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingMembers ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">Loading members...</TableCell>
                                    </TableRow>
                                ) : orgMembers.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{member.firstName} {member.lastName}</div>
                                                <div className="text-sm text-gray-600">{member.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">{member.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '-'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm capitalize">{member.joined_via || 'manual'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                                onClick={() => handleRemoveMember(member.id)}
                                                disabled={isRemovingMember === member.id}
                                            >
                                                <LogOut className="w-3 h-3 mr-1" />
                                                {isRemovingMember === member.id ? 'Removing...' : 'Remove'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {orgMembers.length === 0 && !isLoadingMembers && (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>No members found</p>
                            <p className="text-sm">Members will appear here once they join your organization.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Volunteer Directory */}
            <Card className="border-waterbase-200">
                <CardHeader>
                    <CardTitle>Volunteer Directory</CardTitle>
                    <CardDescription>
                        Volunteers who have participated in your cleanup events
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Volunteers Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Volunteer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Events</TableHead>
                                    <TableHead>Points</TableHead>
                                    <TableHead>Last Activity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVolunteers.map((volunteer) => (
                                    <TableRow key={volunteer.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">
                                                    {volunteer.firstName} {volunteer.lastName}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {volunteer.email}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("text-xs", getStatusColor(volunteer.status))}>
                                                {volunteer.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{volunteer.totalEvents} total</div>
                                                <div className="text-gray-600">{volunteer.eventsThisMonth} this month</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{volunteer.totalPoints}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{volunteer.lastActivity}</div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {filteredVolunteers.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>No volunteers found</p>
                            <p className="text-sm">
                                Volunteers will appear here once they join your events and the participant tracking system is fully implemented
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
