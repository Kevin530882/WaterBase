import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Navigation from "@/components/Navigation";
import { Calendar, Award, Clock, Star, TrendingUp, } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Events } from "../components/pagecomponents/volunteer/Events";
import { History } from "../components/pagecomponents/volunteer/History";
import { eventService, Event } from "@/services/eventService";


// Mock volunteer profile stats
const volunteerStats = {
totalPoints: 875,
eventsJoined: 12,
hoursVolunteered: 36,
badgesEarned: 8,
currentLevel: "Environmental Champion",
nextLevel: "Eco Warrior",
pointsToNext: 125,
};

export const VolunteerPortal = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState("events");
    const [volunteerHistory, setVolunteerHistory] = useState<Event[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [totalPoints, setTotalPoints] = useState(0);

    useEffect(() => {
        fetchVolunteerHistory();
    }, [token]);

    const fetchVolunteerHistory = async () => {
        if (!token) return;

        try {
            setIsLoadingHistory(true);
            const history = await eventService.getUserEvents(token);
            setVolunteerHistory(history);

            const points = history
                .filter(event => event.status.toLowerCase() === 'completed')
                .reduce((total, event) => total + (event.points || 0), 0);
            setTotalPoints(points);
        } catch (error) {
            console.error('Error fetching volunteer history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
            <Navigation />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-waterbase-950 mb-2">
                        Volunteer Portal
                    </h1>
                    <p className="text-waterbase-700 mb-4">
                        Join cleanup events and make a difference in water conservation
                    </p>
                    <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="bg-enviro-50 text-enviro-700">
                            Volunteer Access
                        </Badge>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            {totalPoints} Points
                        </Badge>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="events" className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Available Events</span>
                    </TabsTrigger>
                    <TabsTrigger
                    value="profile"
                    className="flex items-center space-x-2"
                    >
                    <Award className="w-4 h-4" />
                    <span>My Profile</span>
                    </TabsTrigger>
                    <TabsTrigger
                    value="history"
                    className="flex items-center space-x-2"
                    >
                    <Clock className="w-4 h-4" />
                    <span>My History</span>
                    </TabsTrigger>
                </TabsList>

                <Events />

                <TabsContent value="profile">
                    <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-waterbase-950">
                        Volunteer Profile
                    </h2>

                    {/* Profile Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="border-waterbase-200">
                        <CardContent className="p-6 text-center">
                            <Award className="w-12 h-12 text-waterbase-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-waterbase-950">
                            {volunteerStats.totalPoints}
                            </h3>
                            <p className="text-waterbase-600">Total Points</p>
                        </CardContent>
                        </Card>

                        <Card className="border-waterbase-200">
                        <CardContent className="p-6 text-center">
                            <Calendar className="w-12 h-12 text-enviro-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-waterbase-950">
                            {volunteerStats.eventsJoined}
                            </h3>
                            <p className="text-waterbase-600">Events Joined</p>
                        </CardContent>
                        </Card>

                        <Card className="border-waterbase-200">
                        <CardContent className="p-6 text-center">
                            <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-waterbase-950">
                            {volunteerStats.hoursVolunteered}
                            </h3>
                            <p className="text-waterbase-600">Hours Volunteered</p>
                        </CardContent>
                        </Card>

                        <Card className="border-waterbase-200">
                        <CardContent className="p-6 text-center">
                            <Star className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-waterbase-950">
                            {volunteerStats.badgesEarned}
                            </h3>
                            <p className="text-waterbase-600">Badges Earned</p>
                        </CardContent>
                        </Card>
                    </div>

                    {/* Level Progress */}
                    <Card className="border-waterbase-200">
                        <CardHeader>
                        <CardTitle className="flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Level Progress
                        </CardTitle>
                        <CardDescription>
                            Your journey to environmental leadership
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-waterbase-950">
                                Current: {volunteerStats.currentLevel}
                                </h3>
                                <p className="text-sm text-gray-600">
                                Next: {volunteerStats.nextLevel}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-waterbase-950">
                                {volunteerStats.pointsToNext} points to go
                                </div>
                                <div className="text-sm text-gray-600">
                                {volunteerStats.totalPoints}/
                                {volunteerStats.totalPoints +
                                    volunteerStats.pointsToNext}
                                </div>
                            </div>
                            </div>
                            <Progress
                            value={
                                (volunteerStats.totalPoints /
                                (volunteerStats.totalPoints +
                                    volunteerStats.pointsToNext)) *
                                100
                            }
                            className="h-3"
                            />
                        </div>
                        </CardContent>
                    </Card>

                    {/* Badges Showcase */}
                    <Card className="border-waterbase-200">
                        <CardHeader>
                        <CardTitle>Achievement Badges</CardTitle>
                        <CardDescription>
                            Badges earned from your environmental contributions
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                            "Ocean Guardian",
                            "River Protector",
                            "Lake Guardian",
                            "Eco Warrior",
                            "Community Leader",
                            "Green Champion",
                            "Water Defender",
                            "Environmental Hero",
                            ].map((badge, index) => (
                            <div
                                key={index}
                                className={cn(
                                "p-4 rounded-lg text-center",
                                index < volunteerStats.badgesEarned
                                    ? "bg-gradient-to-br from-enviro-100 to-waterbase-100 border border-enviro-200"
                                    : "bg-gray-50 border border-gray-200 opacity-50",
                                )}
                            >
                                <Award
                                className={cn(
                                    "w-8 h-8 mx-auto mb-2",
                                    index < volunteerStats.badgesEarned
                                    ? "text-enviro-600"
                                    : "text-gray-400",
                                )}
                                />
                                <div
                                className={cn(
                                    "text-xs font-medium",
                                    index < volunteerStats.badgesEarned
                                    ? "text-enviro-800"
                                    : "text-gray-500",
                                )}
                                >
                                {badge}
                                </div>
                            </div>
                            ))}
                        </div>
                        </CardContent>
                    </Card>
                    </div>
                </TabsContent>
                
                <History />
                </Tabs>
            </div>
        </div>
    );
};