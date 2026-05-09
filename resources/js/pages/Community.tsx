import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building, CalendarDays, Heart, MapPin, MessageSquare, QrCode, Users, X } from "lucide-react";

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

interface CleanupDrive {
  id: number;
  title: string;
  address: string;
  date: string;
  time: string;
  duration: string | number;
  description: string;
  maxVolunteers: number;
  currentVolunteers?: number;
  points: number;
  badge?: string;
  status: string;
  creator?: {
    firstName: string;
    lastName: string;
    organization?: string;
  };
  pivot?: {
    is_present?: boolean | number;
  };
}

type CommunitySection = "drives" | "feed" | "organizations";

export const Community = () => {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<CommunitySection>("drives");
  const [updates, setUpdates] = useState<CommunityUpdate[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationDirectoryEntry[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestRecord[]>([]);
  const [orgJoinRequests, setOrgJoinRequests] = useState<JoinRequestRecord[]>([]);
  const [autoAcceptJoinRequests, setAutoAcceptJoinRequests] = useState(false);
  const [cleanupDrives, setCleanupDrives] = useState<CleanupDrive[]>([]);
  const [joinedDriveIds, setJoinedDriveIds] = useState<number[]>([]);
  const [presentDriveIds, setPresentDriveIds] = useState<Set<number>>(new Set());
  const [driveActionId, setDriveActionId] = useState<number | null>(null);
  const [selectedDrive, setSelectedDrive] = useState<CleanupDrive | null>(null);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isOrganizationAccount = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return role === "ngo" || role === "lgu";
  }, [user?.role]);

  const isVolunteer = (user?.role || "").toLowerCase() === "volunteer";

  const canJoinOrganizations = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return role !== "ngo" && role !== "lgu" && role !== "admin" && role !== "researcher";
  }, [user?.role]);

  const requestByOrganizationId = useMemo(() => {
    const map: Record<number, JoinRequestRecord> = {};
    joinRequests.forEach((request) => {
      if (!map[request.organization_user_id]) {
        map[request.organization_user_id] = request;
      }
    });
    return map;
  }, [joinRequests]);

  const filteredOrganizations = useMemo(() => {
    const query = orgSearchQuery.trim().toLowerCase();
    if (!query) return organizations;

    return organizations.filter((organization) => {
      const name = (organization.organization || `${organization.firstName} ${organization.lastName}`).toLowerCase();
      const area = (organization.areaOfResponsibility || "").toLowerCase();
      return name.includes(query) || area.includes(query);
    });
  }, [organizations, orgSearchQuery]);

  const joinedDriveIdSet = useMemo(() => new Set(joinedDriveIds), [joinedDriveIds]);

  const fetchCommunityData = useCallback(async () => {
    if (!token || !user) return;

    try {
      setIsLoading(true);
      setError(null);
      const requests = [
        fetch("/api/community/feed", { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
        fetch("/api/organizations/directory", { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
        fetch("/api/user/join-requests", { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
        fetch("/api/events", { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
        fetch("/api/user/events", { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
      ];

      const [feedResponse, directoryResponse, requestsResponse, eventsResponse, userEventsResponse] = await Promise.all(requests);
      const feedPayload = feedResponse.ok ? await feedResponse.json() : { data: [] };
      const directoryPayload = directoryResponse.ok ? await directoryResponse.json() : { data: [] };
      const requestsPayload = requestsResponse.ok ? await requestsResponse.json() : { data: [] };
      const eventsPayload = eventsResponse.ok ? await eventsResponse.json() : [];
      const userEventsPayload = userEventsResponse.ok ? await userEventsResponse.json() : [];

      const userEvents = Array.isArray(userEventsPayload) ? userEventsPayload : [];
      setUpdates(Array.isArray(feedPayload?.data) ? feedPayload.data : []);
      setOrganizations(Array.isArray(directoryPayload?.data) ? directoryPayload.data : []);
      setJoinRequests(Array.isArray(requestsPayload?.data) ? requestsPayload.data : []);
      setCleanupDrives(Array.isArray(eventsPayload) ? eventsPayload : Array.isArray(eventsPayload?.data) ? eventsPayload.data : []);
      setJoinedDriveIds(userEvents.map((event: CleanupDrive) => Number(event?.id)).filter((eventId: number) => !Number.isNaN(eventId)));
      setPresentDriveIds(
        new Set(
          userEvents
            .filter((event: CleanupDrive) => event.pivot?.is_present === true || event.pivot?.is_present === 1)
            .map((event: CleanupDrive) => Number(event?.id))
            .filter((eventId: number) => !Number.isNaN(eventId))
        )
      );

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
    } catch (err) {
      console.error("Failed to load community data:", err);
      setError(err instanceof Error ? err.message : "Failed to load community data");
    } finally {
      setIsLoading(false);
    }
  }, [isOrganizationAccount, token, user]);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  const authorizedFetch = async (url: string, options: RequestInit = {}) => {
    if (!token) return;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
  };

  const handleFollow = async (organizationId: number, isFollowing: boolean) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await authorizedFetch(`/api/organizations/${organizationId}/follow`, { method: isFollowing ? "DELETE" : "POST" });
      await fetchCommunityData();
    } catch (err) {
      console.error("Failed to update follow status:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRequest = async (organizationId: number) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await authorizedFetch(`/api/organizations/${organizationId}/join-requests`, { method: "POST", body: JSON.stringify({}) });
      await fetchCommunityData();
    } catch (err) {
      console.error("Failed to create join request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelJoinRequest = async (organizationId: number) => {
    const request = requestByOrganizationId[organizationId];
    if (isSubmitting || !request || request.status !== "pending") return;

    try {
      setIsSubmitting(true);
      await authorizedFetch(`/api/organizations/${organizationId}/join-requests/${request.id}`, { method: "DELETE" });
      await fetchCommunityData();
    } catch (err) {
      console.error("Failed to cancel join request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateJoinRequest = async (requestId: number, status: "accepted" | "rejected") => {
    if (!user || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await authorizedFetch(`/api/organizations/${user.id}/join-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await fetchCommunityData();
    } catch (err) {
      console.error("Failed to moderate join request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoAcceptToggle = async () => {
    if (!user || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await authorizedFetch(`/api/organizations/${user.id}/join-settings`, {
        method: "PATCH",
        body: JSON.stringify({ auto_accept_join_requests: !autoAcceptJoinRequests }),
      });
      await fetchCommunityData();
    } catch (err) {
      console.error("Failed to update auto accept setting:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleanupParticipation = async (driveId: number, isJoined: boolean) => {
    if (!isVolunteer || isSubmitting || driveActionId === driveId) return;
    try {
      setDriveActionId(driveId);
      setIsSubmitting(true);
      await authorizedFetch(`/api/events/${driveId}/${isJoined ? "leave" : "join"}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await fetchCommunityData();
    } catch (err) {
      console.error("Failed to update cleanup participation:", err);
    } finally {
      setDriveActionId(null);
      setIsSubmitting(false);
    }
  };

  const recruitingDrives = cleanupDrives.filter((drive) => drive.status === "recruiting" || drive.status === "active");

  return (
    <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-waterbase-950">Community Hub</h1>
          <p className="text-waterbase-700 mt-2">Join cleanup drives, follow organizations, and read updates from your network.</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-700">{error}</CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          {[
            { key: "drives", label: "Cleanup Drives" },
            { key: "feed", label: "Community Feed" },
            { key: "organizations", label: "Organizations" },
          ].map((section) => (
            <Button
              key={section.key}
              variant={activeSection === section.key ? "default" : "outline"}
              onClick={() => setActiveSection(section.key as CommunitySection)}
            >
              {section.label}
            </Button>
          ))}
          <Button variant="outline" onClick={fetchCommunityData} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {isOrganizationAccount && (
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">Organization Join Controls</CardTitle>
              <CardDescription className="text-waterbase-600">Manage incoming membership requests and optional auto-accept behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-waterbase-200 bg-waterbase-50 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-waterbase-950">Auto-accept join requests</h3>
                  <p className="text-sm text-waterbase-700">
                    {autoAcceptJoinRequests ? "Enabled: requests become memberships immediately." : "Disabled: requests wait for approval."}
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
                          <Button className="bg-enviro-500 hover:bg-enviro-600" disabled={isSubmitting} onClick={() => handleUpdateJoinRequest(request.id, "accepted")}>
                            Accept
                          </Button>
                          <Button variant="destructive" disabled={isSubmitting} onClick={() => handleUpdateJoinRequest(request.id, "rejected")}>
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

        {activeSection === "drives" && (
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">Cleanup Drives</CardTitle>
              <CardDescription className="text-waterbase-600">Recruiting and active volunteer events from the backend event queue.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-waterbase-700">Loading cleanup drives...</p>
              ) : recruitingDrives.length === 0 ? (
                <p className="text-waterbase-700">No cleanup drives are recruiting right now.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recruitingDrives.map((drive) => {
                    const volunteers = drive.currentVolunteers ?? 0;
                    const slotsLeft = Math.max((drive.maxVolunteers ?? 0) - volunteers, 0);
                    const isJoined = joinedDriveIdSet.has(drive.id);
                    const isPresent = presentDriveIds.has(drive.id);

                    return (
                      <Card key={drive.id} className="border-waterbase-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-base text-waterbase-950">{drive.title}</CardTitle>
                              <CardDescription className="flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {drive.address}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="capitalize">{drive.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-waterbase-700 line-clamp-3">{drive.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-waterbase-700">
                            <Badge variant="outline" className="gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {new Date(`${drive.date}T${drive.time}`).toLocaleString()}
                            </Badge>
                            <Badge variant="outline">{volunteers}/{drive.maxVolunteers} volunteers</Badge>
                            <Badge variant="outline">{slotsLeft} slots left</Badge>
                            <Badge variant="outline">{drive.points} points</Badge>
                            {isPresent && <Badge className="bg-teal-600">Checked in</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setSelectedDrive(drive)}>View Details</Button>
                            {isVolunteer && (
                              <Button
                                className={isJoined ? "bg-enviro-500 hover:bg-enviro-600" : ""}
                                variant={isJoined ? "secondary" : "default"}
                                disabled={isSubmitting || driveActionId === drive.id}
                                onClick={() => handleCleanupParticipation(drive.id, isJoined)}
                              >
                                {isJoined ? (driveActionId === drive.id ? "Cancelling..." : "Cancel Participation") : (driveActionId === drive.id ? "Joining..." : "Join Cleanup Drive")}
                              </Button>
                            )}
                            {isJoined && !isPresent && (
                              <Button asChild variant="outline" className="gap-2">
                                <Link to="/my-events">
                                  <QrCode className="w-4 h-4" />
                                  Open My Events for QR
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "feed" && (
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">Community Feed</CardTitle>
              <CardDescription className="text-waterbase-600">Updates from organizations you follow or joined.</CardDescription>
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
                      <p className="text-xs text-waterbase-600">{new Date(update.published_at || update.created_at || Date.now()).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "organizations" && (
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">Organizations</CardTitle>
              <CardDescription className="text-waterbase-600">Browse organizations, follow them, and request membership.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={orgSearchQuery} onChange={(event) => setOrgSearchQuery(event.target.value)} placeholder="Search organizations or areas..." />
              {isLoading ? (
                <p className="text-waterbase-700">Loading organizations...</p>
              ) : filteredOrganizations.length === 0 ? (
                <p className="text-waterbase-700">No organizations match your search.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredOrganizations.map((organization) => {
                    const request = requestByOrganizationId[organization.id];
                    const requestStatus = request?.status;
                    const canCancelRequest = requestStatus === "pending";

                    return (
                      <Card key={organization.id} className="border-waterbase-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-waterbase-950 flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            <Link to={`/organizations/${organization.id}`} className="hover:underline">
                              {organization.organization || `${organization.firstName} ${organization.lastName}`}
                            </Link>
                          </CardTitle>
                          <CardDescription className="text-waterbase-700">{organization.areaOfResponsibility || "No area of responsibility set"}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          <Button variant={organization.is_following ? "outline" : "default"} disabled={isSubmitting} onClick={() => handleFollow(organization.id, organization.is_following)}>
                            <Heart className="w-4 h-4 mr-2" />
                            {organization.is_following ? "Following" : "Follow"}
                          </Button>

                          {canJoinOrganizations && (
                            <Button
                              className={organization.is_member ? "" : canCancelRequest ? "border-red-200 text-red-700 hover:bg-red-50" : "bg-enviro-500 hover:bg-enviro-600"}
                              variant={organization.is_member || canCancelRequest ? "outline" : "default"}
                              disabled={isSubmitting || organization.is_member}
                              onClick={() => (canCancelRequest ? handleCancelJoinRequest(organization.id) : handleJoinRequest(organization.id))}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              {organization.is_member ? "Member" : canCancelRequest ? "Cancel Request" : "Join"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedDrive && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
            <Card className="w-full max-w-lg border-waterbase-200">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-waterbase-950">{selectedDrive.title}</CardTitle>
                    <CardDescription>{selectedDrive.address}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDrive(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-waterbase-700">
                <p>{selectedDrive.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="font-medium">Date:</span> {selectedDrive.date}</div>
                  <div><span className="font-medium">Time:</span> {selectedDrive.time}</div>
                  <div><span className="font-medium">Duration:</span> {selectedDrive.duration} hours</div>
                  <div><span className="font-medium">Points:</span> {selectedDrive.points}</div>
                  <div><span className="font-medium">Volunteers:</span> {selectedDrive.currentVolunteers ?? 0}/{selectedDrive.maxVolunteers}</div>
                  <div><span className="font-medium">Status:</span> {selectedDrive.status}</div>
                </div>
                {selectedDrive.creator && (
                  <p className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Created by {selectedDrive.creator.organization || `${selectedDrive.creator.firstName} ${selectedDrive.creator.lastName}`}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
