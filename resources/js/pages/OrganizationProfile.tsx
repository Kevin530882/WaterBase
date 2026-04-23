import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, Users } from "lucide-react";

interface OrganizationUpdate {
    id: number;
    title: string;
    content: string;
    update_type: "update" | "announcement" | "event";
    published_at?: string;
    created_at?: string;
}

interface OrganizationPayload {
    organization: {
        id: number;
        firstName: string;
        lastName: string;
        organization?: string;
        email: string;
        areaOfResponsibility?: string;
        role: string;
        followers_count: number;
        members_count: number;
    };
    is_following: boolean;
    is_member: boolean;
    updates: OrganizationUpdate[];
}

export const OrganizationProfile = () => {
    const { organizationId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [profile, setProfile] = useState<OrganizationPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!token || !organizationId) return;

        try {
            setIsLoading(true);
            const response = await fetch(`/api/organizations/${organizationId}/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch organization profile");
            }

            const data = await response.json();
            setProfile(data);
        } catch (error) {
            console.error("Error loading organization profile:", error);
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, token]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleFollowToggle = async () => {
        if (!token || !organizationId || !profile || isSubmitting) return;

        try {
            setIsSubmitting(true);
            await fetch(`/api/organizations/${organizationId}/follow`, {
                method: profile.is_following ? "DELETE" : "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            });
            await fetchProfile();
        } catch (error) {
            console.error("Failed to update follow state:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleJoinRequest = async () => {
        if (!token || !organizationId || !profile || profile.is_member || isSubmitting) return;

        try {
            setIsSubmitting(true);
            await fetch(`/api/organizations/${organizationId}/join-requests`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            });
            await fetchProfile();
        } catch (error) {
            console.error("Failed to send join request:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!organizationId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
                <Navigation />
                <div className="max-w-4xl mx-auto py-10 px-4">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-waterbase-700">Invalid organization.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
            <Navigation />

            <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    Back
                </Button>

                {isLoading ? (
                    <Card>
                        <CardContent className="pt-6">Loading organization profile...</CardContent>
                    </Card>
                ) : profile ? (
                    <>
                        <Card className="border-waterbase-200">
                            <CardHeader>
                                <CardTitle className="text-waterbase-950 flex items-center gap-2">
                                    <Building className="w-5 h-5" />
                                    {profile.organization.organization || `${profile.organization.firstName} ${profile.organization.lastName}`}
                                </CardTitle>
                                <CardDescription>{profile.organization.email}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{profile.organization.role.toUpperCase()}</Badge>
                                    <Badge variant="outline" className="flex items-center gap-1">
                                        <Users className="w-3 h-3" /> {profile.organization.followers_count} followers
                                    </Badge>
                                    <Badge variant="outline">{profile.organization.members_count} members</Badge>
                                </div>

                                {profile.organization.areaOfResponsibility && (
                                    <p className="text-sm text-waterbase-700 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> {profile.organization.areaOfResponsibility}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant={profile.is_following ? "outline" : "default"}
                                        onClick={handleFollowToggle}
                                        disabled={isSubmitting}
                                    >
                                        {profile.is_following ? "Following" : "Follow"}
                                    </Button>
                                    <Button
                                        className="bg-enviro-500 hover:bg-enviro-600"
                                        onClick={handleJoinRequest}
                                        disabled={isSubmitting || profile.is_member}
                                    >
                                        {profile.is_member ? "Member" : "Request to Join"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-waterbase-200">
                            <CardHeader>
                                <CardTitle className="text-waterbase-950">Organization Updates</CardTitle>
                                <CardDescription>Latest posts from this organization</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {profile.updates.length === 0 ? (
                                    <p className="text-waterbase-700">No updates yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {profile.updates.map((update) => (
                                            <div key={update.id} className="p-4 rounded-lg bg-waterbase-50 border border-waterbase-200">
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <h4 className="font-semibold text-waterbase-950">{update.title}</h4>
                                                    <Badge variant="outline" className="capitalize">{update.update_type}</Badge>
                                                </div>
                                                <p className="text-sm text-waterbase-700 mb-2">{update.content}</p>
                                                <p className="text-xs text-waterbase-600">
                                                    {new Date(update.published_at || update.created_at || Date.now()).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <Card>
                        <CardContent className="pt-6">Organization not found.</CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};
