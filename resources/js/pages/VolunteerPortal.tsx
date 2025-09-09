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
import { MyProfile } from "@/components/pagecomponents/volunteer/MyProfile";
import { eventService, Event } from "@/services/eventService";

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
                <MyProfile />
                <History />
                </Tabs>
            </div>
        </div>
    );
};