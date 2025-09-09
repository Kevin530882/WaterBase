import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import { User, Camera, MapPin, Award, FileText, Calendar, Users, BarChart3, Star } from "lucide-react";
import { RecentActivity } from "@/components/pagecomponents/RecentActivity";
import { Setting } from "@/components/pagecomponents/Setting";
import { Notification } from "@/components/pagecomponents/Notification";
import { useAuth } from "@/contexts/AuthContext";

interface UserStats {
    reportsSubmitted?: number;
    reportsVerified?: number;
    eventsJoined?: number;
    eventsCreated?: number;
    eventsCompleted?: number;
    badgesEarned?: number;
    volunteersManaged?: number;
    dataAnalyzed?: number;
    researchPublished?: number;
    communityPoints?: number;
    accuracyRate?: number;
    badges?: string[];
}

export const Profile = () => {
    const { user, token } = useAuth();
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        organization: user?.organization || "",
        areaOfResponsibility: user?.areaOfResponsibility || "",
    });

    const [userStats, setUserStats] = useState<UserStats>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user && token) {
            fetchUserStats();
        }
    }, [user, token]);

    const fetchUserStats = async () => {
        try {
            setIsLoading(true);

            // Use single endpoint for all roles
            const response = await fetch('/api/user/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const stats = await response.json();
                setUserStats(stats);
            } else {
                console.error('Failed to fetch stats');
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileUpdate = (updatedData: any) => {
        setProfileData(updatedData);
    };

    const getBadgeIcon = (badgeName: string) => {
        const name = badgeName?.toLowerCase() || '';

        if (name.includes('water') || name.includes('clean')) {
            return '💧';
        } else if (name.includes('eco') || name.includes('green')) {
            return '🌱';
        } else if (name.includes('champion') || name.includes('hero')) {
            return '🏆';
        } else if (name.includes('guardian') || name.includes('protector')) {
            return '🛡️';
        } else if (name.includes('volunteer') || name.includes('helper')) {
            return '🤝';
        } else if (name.includes('leader') || name.includes('captain')) {
            return '⭐';
        }
        return '🏅'; // Default badge icon
    };

    const renderStatsCards = () => {
        const role = user?.role?.toLowerCase() || 'volunteer';
        const showCommunityPoints = !['lgu', 'ngo', 'researcher'].includes(role);

        const getStatsConfig = () => {
            switch (role) {
                case 'volunteer':
                    return [
                        {
                            icon: <FileText className="w-6 h-6 text-waterbase-600" />,
                            value: userStats.reportsSubmitted || 0,
                            label: "Reports Submitted"
                        },
                        {
                            icon: <Calendar className="w-6 h-6 text-enviro-600" />,
                            value: userStats.eventsJoined || 0,
                            label: "Events Joined"
                        },
                        {
                            icon: <Star className="w-6 h-6 text-yellow-600" />,
                            value: userStats.badgesEarned || 0,
                            label: "Badges Earned"
                        },
                        {
                            icon: <Award className="w-6 h-6 text-purple-600" />,
                            value: userStats.communityPoints || 0,
                            label: "Community Points"
                        }
                    ];

                case 'ngo':
                case 'lgu':
                    return [
                        {
                            icon: <Calendar className="w-6 h-6 text-waterbase-600" />,
                            value: userStats.eventsCreated || 0,
                            label: "Events Created"
                        },
                        {
                            icon: <Award className="w-6 h-6 text-enviro-600" />,
                            value: userStats.eventsCompleted || 0,
                            label: "Events Completed"
                        },
                        {
                            icon: <Users className="w-6 h-6 text-purple-600" />,
                            value: userStats.volunteersManaged || 0,
                            label: "Volunteers Managed"
                        },
                        {
                            icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
                            value: `${userStats.accuracyRate || 0}%`,
                            label: "Success Rate"
                        }
                    ];

                case 'researcher':
                    return [
                        {
                            icon: <BarChart3 className="w-6 h-6 text-waterbase-600" />,
                            value: userStats.dataAnalyzed || 0,
                            label: "Data Sets Analyzed"
                        },
                        {
                            icon: <FileText className="w-6 h-6 text-enviro-600" />,
                            value: userStats.researchPublished || 0,
                            label: "Research Published"
                        },
                        {
                            icon: <Award className="w-6 h-6 text-yellow-600" />,
                            value: userStats.reportsSubmitted || 0,
                            label: "Reports Submitted"
                        },
                        {
                            icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
                            value: `${userStats.accuracyRate || 0}%`,
                            label: "Accuracy Rate"
                        }
                    ];

                default:
                    return [
                        {
                            icon: <FileText className="w-6 h-6 text-waterbase-600" />,
                            value: userStats.reportsSubmitted || 0,
                            label: "Reports Submitted"
                        },
                        {
                            icon: <Award className="w-6 h-6 text-purple-600" />,
                            value: userStats.communityPoints || 0,
                            label: "Community Points"
                        }
                    ];
            }
        };

        return getStatsConfig().map((stat, index) => (
            <Card key={index} className="border-waterbase-200">
                <CardContent className="p-3 sm:p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                        {stat.icon}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-waterbase-950">
                        {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-waterbase-600 leading-tight">
                        {stat.label}
                    </div>
                </CardContent>
            </Card>
        ));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
            <Navigation />

            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Profile Header */}
                <Card className="border-waterbase-200 mb-6">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                            <div className="relative flex-shrink-0">
                                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                                    <AvatarImage src="/placeholder-avatar.jpg" />
                                    <AvatarFallback className="bg-waterbase-100 text-waterbase-700 text-lg sm:text-xl">
                                        {profileData.firstName[0] || 'U'}
                                        {profileData.lastName[0] || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="absolute -bottom-2 -right-2 h-6 w-6 sm:h-8 sm:w-8 rounded-full"
                                >
                                    <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                            </div>

                            <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-waterbase-950 break-words mb-3 sm:mb-2">
                                    {profileData.firstName} {profileData.lastName}
                                </h1>
                                <div className="flex gap-5 sm:flex-col sm:gap-2 text-xs sm:text-sm text-waterbase-600 mb-3 max-w-xs mx-auto sm:max-w-none sm:mx-0 justify-center sm:justify-start">
                                    {profileData.areaOfResponsibility && (
                                        <div className="flex items-center space-x-1">
                                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                            <span className="break-words truncate">{profileData.areaOfResponsibility}</span>
                                        </div>
                                    )}
                                    {profileData.organization && (
                                        <div className="flex items-center space-x-1">
                                            <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                            <span className="break-words truncate">{profileData.organization}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1 sm:gap-2 mb-3">
                                    <Badge variant="outline" className="text-xs px-2 py-1 h-auto">
                                        {user?.role?.toUpperCase() || 'VOLUNTEER'} Role
                                    </Badge>
                                    <Badge variant="outline" className="text-xs px-2 py-1 h-auto">
                                        Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long'
                                        })}
                                    </Badge>
                                </div>

                                {/* Badges Display */}
                                {userStats.badges && userStats.badges.length > 0 && (
                                    <div className="flex flex-col items-center sm:items-start sm:flex-row sm:items-center gap-2">
                                        <span className="text-xs sm:text-sm font-medium text-waterbase-700">Badges:</span>
                                        <div className="flex flex-wrap justify-center sm:justify-start gap-1">
                                            {userStats.badges.slice(0, 5).map((badge, index) => (
                                                <Tooltip key={index}>
                                                    <TooltipTrigger>
                                                        <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full border-2 border-yellow-300 text-sm sm:text-lg hover:scale-110 transition-transform cursor-pointer">
                                                            {getBadgeIcon(badge)}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-medium text-xs sm:text-sm">{badge}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                            {userStats.badges.length > 5 && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full border-2 border-gray-300 text-xs font-bold text-gray-600 hover:scale-110 transition-transform cursor-pointer">
                                                            +{userStats.badges.length - 5}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="max-w-xs">
                                                            <p className="font-medium mb-2 text-sm">All Badges:</p>
                                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                                {userStats.badges.map((badge, index) => (
                                                                    <div key={index} className="flex items-center space-x-1">
                                                                        <span>{getBadgeIcon(badge)}</span>
                                                                        <span>{badge}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    {isLoading ? (
                        // Loading skeleton
                        Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i} className="border-waterbase-200">
                                <CardContent className="p-4 text-center">
                                    <div className="animate-pulse">
                                        <div className="w-6 h-6 bg-gray-300 rounded mx-auto mb-2"></div>
                                        <div className="w-8 h-6 bg-gray-300 rounded mx-auto mb-2"></div>
                                        <div className="w-16 h-4 bg-gray-300 rounded mx-auto"></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        renderStatsCards()
                    )}
                </div>

                {/* Tabbed Content */}
                <Tabs defaultValue="activity" className="space-y-3">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <RecentActivity />
                    <Notification />
                    <Setting onProfileUpdate={handleProfileUpdate} />
                </Tabs>
            </div>
        </div>
    );
};