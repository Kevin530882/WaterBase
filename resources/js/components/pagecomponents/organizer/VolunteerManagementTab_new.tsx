import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Users,
    Award,
    CheckCircle,
    Search,
    Eye,
    Loader2,
    AlertCircle,
    Trophy,
    Star,
    RefreshCw,
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

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [rankFilter, setRankFilter] = useState<string>("all");

    const fetchVolunteers = async () => {
        if (!token || !user?.id) return;

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

                // For now, create empty volunteers array since we don't have participant data
                const volunteersArray: Volunteer[] = [];

                setVolunteers(volunteersArray);
                setStats({
                    totalVolunteers: volunteersArray.length,
                    activeThisMonth: 0,
                    totalPointsAwarded: 0,
                    averageEventsPerVolunteer: 0,
                    topVolunteers: []
                });
            } else {
                throw new Error('Failed to fetch events');
            }
        } catch (error) {
            console.error('Error fetching volunteers:', error);
            setError('Failed to load volunteer data. This feature requires participant tracking.');
        } finally {
            setIsLoading(false);
        }
    };

    const getRankColor = (rank: string) => {
        switch (rank) {
            case "Champion": return "bg-purple-500 text-white";
            case "Expert": return "bg-blue-500 text-white";
            case "Experienced": return "bg-green-500 text-white";
            case "Active": return "bg-yellow-500 text-black";
            default: return "bg-gray-500 text-white";
        }
    };

    const getStatusColor = (status: string) => {
        return status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white';
    };

    const filteredVolunteers = volunteers.filter(volunteer => {
        const matchesSearch =
            volunteer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            volunteer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            volunteer.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || volunteer.status === statusFilter;
        const matchesRank = rankFilter === 'all' || volunteer.rank === rankFilter;

        return matchesSearch && matchesStatus && matchesRank;
    });

    useEffect(() => {
        fetchVolunteers();
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
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
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

            {/* Volunteer Directory */}
            <Card className="border-waterbase-200">
                <CardHeader>
                    <CardTitle>Volunteer Directory</CardTitle>
                    <CardDescription>
                        Volunteers who have participated in your cleanup events
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search volunteers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={rankFilter} onValueChange={setRankFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by rank" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Ranks</SelectItem>
                                <SelectItem value="Champion">Champion</SelectItem>
                                <SelectItem value="Expert">Expert</SelectItem>
                                <SelectItem value="Experienced">Experienced</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Newcomer">Newcomer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Volunteers Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Volunteer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Events</TableHead>
                                    <TableHead>Points</TableHead>
                                    <TableHead>Last Activity</TableHead>
                                    <TableHead>Actions</TableHead>
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
                                            <Badge className={cn("text-xs", getRankColor(volunteer.rank))}>
                                                {volunteer.rank}
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
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {filteredVolunteers.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>No volunteers found</p>
                            <p className="text-sm">
                                Volunteers will appear here once the participant tracking system is implemented
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
