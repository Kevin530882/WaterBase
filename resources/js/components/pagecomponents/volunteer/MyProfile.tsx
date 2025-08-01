import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Calendar, Award, Clock, Star, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface VolunteerStats {
    communityPoints: number;
    eventsJoined: number;
    totalHours: number;
    badgesEarned: number;
    badges: string[];
}

export const MyProfile = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState<VolunteerStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchStats = async () => {
        if (!token) {
            setError("User not authenticated");
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            const response = await fetch('/api/user/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                setError(`Failed to fetch stats (${response.status}). Please try again.`);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [token]);

    if (isLoading) {
        return (
            <TabsContent value="profile">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
                        <p className="text-waterbase-600">Loading your profile...</p>
                    </div>
                </div>
            </TabsContent>
        );
    }
    return (
        <TabsContent value="profile">
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-waterbase-950">
                    Volunteer Profile
                </h2>

                {error && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Profile Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-waterbase-200">
                        <CardContent className="p-6 text-center">
                            <Award className="w-12 h-12 text-waterbase-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-waterbase-950">
                                {stats?.communityPoints || 0}
                            </h3>
                            <p className="text-waterbase-600">Total Points</p>
                        </CardContent>
                    </Card>

                    <Card className="border-waterbase-200">
                        <CardContent className="p-6 text-center">
                            <Calendar className="w-12 h-12 text-enviro-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-waterbase-950">
                                {stats?.eventsJoined || 0}
                            </h3>
                            <p className="text-waterbase-600">Events Joined</p>
                        </CardContent>
                    </Card>

                    <Card className="border-waterbase-200">
                        <CardContent className="p-6 text-center">
                            <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-waterbase-950">
                                {stats?.totalHours || 0}
                            </h3>
                            <p className="text-waterbase-600">Hours Volunteered</p>
                        </CardContent>
                    </Card>

                    <Card className="border-waterbase-200">
                        <CardContent className="p-6 text-center">
                            <Star className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-waterbase-950">
                                {stats?.badgesEarned || 0}
                            </h3>
                            <p className="text-waterbase-600">Badges Earned</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Badges Showcase */}
                <Card className="border-waterbase-200">
                    <CardHeader>
                        <CardTitle>Achievement Badges</CardTitle>
                        <CardDescription>
                            Badges earned from your environmental contributions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats?.badges && stats.badges.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {stats.badges.map((badge, index) => (
                                    <div
                                        key={index}
                                        className="p-4 rounded-lg text-center bg-gradient-to-br from-enviro-100 to-waterbase-100 border border-enviro-200"
                                    >
                                        <Award className="w-8 h-8 mx-auto mb-2 text-enviro-600" />
                                        <div className="text-xs font-medium text-enviro-800">
                                            {badge}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p>No badges earned yet</p>
                                <p className="text-sm">
                                    Complete events to earn your first badge!
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    )
}