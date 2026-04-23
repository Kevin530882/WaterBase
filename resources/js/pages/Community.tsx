import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Heart, Megaphone, MessageSquare, Users } from "lucide-react";

interface CommunityUpdate {
  id: number;
  title: string;
  content: string;
  update_type: "update" | "announcement" | "event";
  published_at?: string;
  created_at?: string;
  organization: {
    id: number;
    firstName: string;
    lastName: string;
    organization?: string;
  };
}

interface OrganizationDirectoryEntry {
  id: number;
  firstName: string;
  lastName: string;
  organization?: string;
  areaOfResponsibility?: string;
  role: string;
  is_following: boolean;
  is_member: boolean;
}

interface JoinRequestRecord {
  id: number;
  organization_user_id: number;
  requester_user_id: number;
  status: "pending" | "accepted" | "rejected" | "auto_accepted" | "cancelled";
  requester?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const Community = () => {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updates, setUpdates] = useState<CommunityUpdate[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationDirectoryEntry[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestRecord[]>([]);
  const [orgJoinRequests, setOrgJoinRequests] = useState<JoinRequestRecord[]>([]);
  const [autoAcceptJoinRequests, setAutoAcceptJoinRequests] = useState(false);

  const isOrganizationAccount = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return role === "ngo" || role === "lgu" || role === "researcher";
  }, [user?.role]);

  const getRequestStatusByOrganizationId = useMemo(() => {
    const map: Record<number, JoinRequestRecord["status"]> = {};
    joinRequests.forEach((request) => {
      map[request.organization_user_id] = request.status;
    });
    return map;
  }, [joinRequests]);

  const fetchCommunityData = useCallback(async () => {
    if (!token || !user) return;

    try {
      setIsLoading(true);
      const [feedResponse, directoryResponse, requestsResponse] = await Promise.all([
        fetch("/api/community/feed", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        }),
        fetch("/api/organizations/directory", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        }),
        fetch("/api/user/join-requests", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        }),
      ]);

      const feedPayload = feedResponse.ok ? await feedResponse.json() : { data: [] };
      const directoryPayload = directoryResponse.ok ? await directoryResponse.json() : { data: [] };
      const requestsPayload = requestsResponse.ok ? await requestsResponse.json() : { data: [] };

      setUpdates(Array.isArray(feedPayload?.data) ? feedPayload.data : []);
      setOrganizations(Array.isArray(directoryPayload?.data) ? directoryPayload.data : []);
      setJoinRequests(Array.isArray(requestsPayload?.data) ? requestsPayload.data : []);

      if (isOrganizationAccount) {
        const [orgRequestsResponse, settingsResponse] = await Promise.all([
          fetch(`/api/organizations/${user.id}/join-requests`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          }),
          fetch(`/api/organizations/${user.id}/join-settings`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          }),
        ]);

        const orgRequestsPayload = orgRequestsResponse.ok ? await orgRequestsResponse.json() : { data: [] };
        const settingsPayload = settingsResponse.ok ? await settingsResponse.json() : { auto_accept_join_requests: false };

        setOrgJoinRequests(Array.isArray(orgRequestsPayload?.data) ? orgRequestsPayload.data : []);
        setAutoAcceptJoinRequests(!!settingsPayload?.auto_accept_join_requests);
      }
    } catch (error) {
      console.error("Failed to load community data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isOrganizationAccount, token, user]);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  const handleFollow = async (organizationId: number, isFollowing: boolean) => {
    if (!token || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await fetch(`/api/organizations/${organizationId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      await fetchCommunityData();
    } catch (error) {
      console.error("Failed to update follow status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRequest = async (organizationId: number) => {
    if (!token || isSubmitting) return;

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
      await fetchCommunityData();
    } catch (error) {
      console.error("Failed to create join request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateJoinRequest = async (requestId: number, status: "accepted" | "rejected") => {
    if (!token || !user || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await fetch(`/api/organizations/${user.id}/join-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      await fetchCommunityData();
    } catch (error) {
      console.error("Failed to moderate join request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoAcceptToggle = async () => {
    if (!token || !user || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await fetch(`/api/organizations/${user.id}/join-settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ auto_accept_join_requests: !autoAcceptJoinRequests }),
      });
      await fetchCommunityData();
    } catch (error) {
      console.error("Failed to update auto accept setting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-waterbase-950 mb-3">Community Hub</h1>
          <p className="text-waterbase-700 max-w-3xl mx-auto">
            Follow organizations, request membership, and receive updates directly in your community feed.
          </p>
        </div>

        {isOrganizationAccount && (
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">Organization Join Controls</CardTitle>
              <CardDescription className="text-waterbase-600">
                Manage incoming membership requests and optional auto-accept behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-waterbase-200 bg-waterbase-50 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-waterbase-950">Auto-accept join requests</h3>
                  <p className="text-sm text-waterbase-700">
                    {autoAcceptJoinRequests
                      ? "Enabled: requests are auto-accepted and users become members immediately."
                      : "Disabled: requests stay pending until you accept or reject."}
                  </p>
                </div>
                <Button variant="outline" onClick={handleAutoAcceptToggle} disabled={isSubmitting}>
                  {autoAcceptJoinRequests ? "Disable" : "Enable"}
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-waterbase-950">Pending Requests</h3>
                {orgJoinRequests.filter((request) => request.status === "pending").length === 0 ? (
                  <p className="text-sm text-waterbase-700">No pending requests.</p>
                ) : (
                  orgJoinRequests
                    .filter((request) => request.status === "pending")
                    .map((request) => (
                      <div key={request.id} className="p-4 rounded-lg border border-waterbase-200 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-medium text-waterbase-950">
                            {request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : `User #${request.requester_user_id}`}
                          </p>
                          <p className="text-sm text-waterbase-700">{request.requester?.email || "No email available"}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="bg-enviro-500 hover:bg-enviro-600"
                            disabled={isSubmitting}
                            onClick={() => handleUpdateJoinRequest(request.id, "accepted")}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={isSubmitting}
                            onClick={() => handleUpdateJoinRequest(request.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-waterbase-200">
          <CardHeader>
            <CardTitle className="text-waterbase-950">Community Feed</CardTitle>
            <CardDescription className="text-waterbase-600">
              Updates from organizations you follow or joined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-waterbase-700">Loading feed...</p>
            ) : updates.length === 0 ? (
              <p className="text-waterbase-700">No updates yet. Follow or join organizations to populate your feed.</p>
            ) : (
              <div className="space-y-4">
                {updates.map((update) => (
                  <div key={update.id} className="p-4 rounded-lg border border-waterbase-200 bg-waterbase-50">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <Link to={`/organizations/${update.organization.id}`} className="font-semibold text-waterbase-950 hover:underline">
                          {update.organization.organization || `${update.organization.firstName} ${update.organization.lastName}`}
                        </Link>
                        <p className="text-sm font-medium text-waterbase-900 mt-1">{update.title}</p>
                      </div>
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

        <Card className="border-waterbase-200">
          <CardHeader>
            <CardTitle className="text-waterbase-950">Organizations</CardTitle>
            <CardDescription className="text-waterbase-600">
              Browse organizations, follow them, and request membership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-waterbase-700">Loading organizations...</p>
            ) : organizations.length === 0 ? (
              <p className="text-waterbase-700">No organizations available yet.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {organizations.map((organization) => {
                  const requestStatus = getRequestStatusByOrganizationId[organization.id];

                  return (
                    <Card key={organization.id} className="border-waterbase-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-waterbase-950 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <Link to={`/organizations/${organization.id}`} className="hover:underline">
                            {organization.organization || `${organization.firstName} ${organization.lastName}`}
                          </Link>
                        </CardTitle>
                        <CardDescription className="text-waterbase-700">
                          {organization.areaOfResponsibility || "No area of responsibility set"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        <Button
                          variant={organization.is_following ? "outline" : "default"}
                          disabled={isSubmitting}
                          onClick={() => handleFollow(organization.id, organization.is_following)}
                        >
                          <Heart className="w-4 h-4 mr-2" />
                          {organization.is_following ? "Following" : "Follow"}
                        </Button>

                        <Button
                          className="bg-enviro-500 hover:bg-enviro-600"
                          disabled={isSubmitting || organization.is_member || requestStatus === "pending"}
                          onClick={() => handleJoinRequest(organization.id)}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          {organization.is_member
                            ? "Member"
                            : requestStatus === "pending"
                              ? "Request Pending"
                              : "Join"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-waterbase-200">
            <CardContent className="pt-6">
              <MessageSquare className="w-5 h-5 text-waterbase-600 mb-2" />
              <h3 className="font-semibold text-waterbase-950 mb-1">Networked Updates</h3>
              <p className="text-sm text-waterbase-700">Followers and members see updates in one community feed.</p>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="pt-6">
              <Megaphone className="w-5 h-5 text-waterbase-600 mb-2" />
              <h3 className="font-semibold text-waterbase-950 mb-1">Organization Control</h3>
              <p className="text-sm text-waterbase-700">Organizations can accept requests or enable auto-accept.</p>
            </CardContent>
          </Card>
          <Card className="border-waterbase-200">
            <CardContent className="pt-6">
              <Building className="w-5 h-5 text-waterbase-600 mb-2" />
              <h3 className="font-semibold text-waterbase-950 mb-1">Organization Profiles</h3>
              <p className="text-sm text-waterbase-700">Open organization pages to view details and activity history.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};