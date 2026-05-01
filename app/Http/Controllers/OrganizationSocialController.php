<?php

namespace App\Http\Controllers;

use App\Models\OrganizationJoinRequest;
use App\Models\OrganizationMembership;
use App\Models\OrganizationSetting;
use App\Models\OrganizationUpdate;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganizationSocialController extends Controller
{
    public function follow(Request $request, int $orgId)
    {
        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        if ($user->id === $organization->id) {
            return response()->json(['message' => 'You cannot follow your own organization account'], 422);
        }

        $user->followedOrganizations()->syncWithoutDetaching([$organization->id]);

        return response()->json([
            'message' => 'Organization followed successfully',
            'organization_id' => $organization->id,
        ]);
    }

    public function unfollow(Request $request, int $orgId)
    {
        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        $user->followedOrganizations()->detach($organization->id);

        return response()->json([
            'message' => 'Organization unfollowed successfully',
            'organization_id' => $organization->id,
        ]);
    }

    public function followStatus(Request $request, int $orgId)
    {
        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        $isFollowing = $user->followedOrganizations()->where('users.id', $organization->id)->exists();
        $isMember = OrganizationMembership::query()
            ->where('user_id', $user->id)
            ->where('organization_user_id', $organization->id)
            ->exists();

        $joinRequest = OrganizationJoinRequest::query()
            ->where('requester_user_id', $user->id)
            ->where('organization_user_id', $organization->id)
            ->orderByDesc('created_at')
            ->first();

        return response()->json([
            'organization_id' => $organization->id,
            'is_following' => $isFollowing,
            'is_member' => $isMember,
        ]);
    }

    public function userFollowingOrganizations(Request $request)
    {
        $user = $request->user();

        $organizations = $user->followedOrganizations()
            ->select('users.id', 'users.firstName', 'users.lastName', 'users.organization', 'users.email', 'users.areaOfResponsibility', 'users.profile_photo', 'users.role')
            ->orderBy('users.organization')
            ->get();

        return response()->json([
            'data' => $organizations,
        ]);
    }

    public function createJoinRequest(Request $request, int $orgId)
    {
        $request->validate([
            'message' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        if ($user->id === $organization->id) {
            return response()->json(['message' => 'You cannot request to join your own organization account'], 422);
        }

        $alreadyMember = OrganizationMembership::query()
            ->where('user_id', $user->id)
            ->where('organization_user_id', $organization->id)
            ->exists();

        if ($alreadyMember) {
            return response()->json([
                'message' => 'You are already a member of this organization',
                'status' => 'already_member',
            ], 200);
        }

        $pendingRequest = OrganizationJoinRequest::query()
            ->where('requester_user_id', $user->id)
            ->where('organization_user_id', $organization->id)
            ->where('status', 'pending')
            ->first();

        if ($pendingRequest) {
            return response()->json([
                'message' => 'A pending request already exists for this organization',
                'status' => 'already_pending',
                'request' => $pendingRequest,
            ], 422);
        }

        $settings = OrganizationSetting::query()->firstOrCreate(
            ['organization_user_id' => $organization->id],
            ['auto_accept_join_requests' => false]
        );

        if ($settings->auto_accept_join_requests) {
            return DB::transaction(function () use ($request, $user, $organization) {
                $joinRequest = OrganizationJoinRequest::query()->create([
                    'requester_user_id' => $user->id,
                    'organization_user_id' => $organization->id,
                    'status' => 'auto_accepted',
                    'message' => $request->input('message'),
                    'reviewed_by_user_id' => $organization->id,
                    'reviewed_at' => now(),
                ]);

                OrganizationMembership::query()->firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'organization_user_id' => $organization->id,
                    ],
                    [
                        'joined_via' => 'auto_accept',
                        'joined_at' => now(),
                    ]
                );

                $user->followedOrganizations()->syncWithoutDetaching([$organization->id]);

                return response()->json([
                    'message' => 'Join request was auto-accepted. You are now a member.',
                    'status' => 'auto_accepted',
                    'request' => $joinRequest,
                ], 201);
            });
        }

        $joinRequest = OrganizationJoinRequest::query()->create([
            'requester_user_id' => $user->id,
            'organization_user_id' => $organization->id,
            'status' => 'pending',
            'message' => $request->input('message'),
        ]);

        return response()->json([
            'message' => 'Join request submitted successfully',
            'status' => 'pending',
            'request' => $joinRequest,
        ], 201);
    }

    public function orgJoinRequests(Request $request, int $orgId)
    {
        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        if (!$this->canModerateOrganization($user, $organization)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $requests = OrganizationJoinRequest::query()
            ->with(['requester:id,firstName,lastName,email,organization,profile_photo', 'reviewer:id,firstName,lastName'])
            ->where('organization_user_id', $organization->id)
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $requests,
        ]);
    }

    public function handleJoinRequest(Request $request, int $orgId, int $requestId)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:accepted,rejected',
        ]);

        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        if (!$this->canModerateOrganization($user, $organization)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $joinRequest = OrganizationJoinRequest::query()
            ->where('organization_user_id', $organization->id)
            ->find($requestId);

        if (!$joinRequest) {
            return response()->json(['message' => 'Join request not found'], 404);
        }

        if ($joinRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending requests can be moderated',
                'request' => $joinRequest,
            ], 422);
        }

        return DB::transaction(function () use ($validated, $user, $organization, $joinRequest) {
            $newStatus = $validated['status'];

            $joinRequest->update([
                'status' => $newStatus,
                'reviewed_by_user_id' => $user->id,
                'reviewed_at' => now(),
            ]);

            if ($newStatus === 'accepted') {
                OrganizationMembership::query()->firstOrCreate(
                    [
                        'user_id' => $joinRequest->requester_user_id,
                        'organization_user_id' => $organization->id,
                    ],
                    [
                        'joined_via' => 'manual',
                        'joined_at' => now(),
                    ]
                );

                User::query()->find($joinRequest->requester_user_id)?->followedOrganizations()->syncWithoutDetaching([$organization->id]);
            }

            $joinRequest->refresh();

            return response()->json([
                'message' => 'Join request updated successfully',
                'request' => $joinRequest,
            ]);
        });
    }

    public function cancelJoinRequest(Request $request, int $orgId, int $requestId)
    {
        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        $joinRequest = OrganizationJoinRequest::query()
            ->where('organization_user_id', $organization->id)
            ->where('requester_user_id', $user->id)
            ->where('status', 'pending')
            ->find($requestId);

        if (!$joinRequest) {
            return response()->json([
                'message' => 'Pending join request not found',
            ], 404);
        }

        $joinRequest->update([
            'status' => 'cancelled',
            'reviewed_by_user_id' => null,
            'reviewed_at' => null,
        ]);

        return response()->json([
            'message' => 'Join request cancelled successfully',
            'request' => $joinRequest->fresh(),
        ]);
    }

    public function userJoinRequests(Request $request)
    {
        $user = $request->user();

        $requests = OrganizationJoinRequest::query()
            ->with(['organization:id,firstName,lastName,organization,email,areaOfResponsibility,profile_photo,role'])
            ->where('requester_user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $requests,
        ]);
    }

    public function userJoinedOrganizations(Request $request)
    {
        $user = $request->user();

        $organizations = $user->joinedOrganizations()
            ->select('users.id', 'users.firstName', 'users.lastName', 'users.organization', 'users.email', 'users.areaOfResponsibility', 'users.profile_photo', 'users.role')
            ->orderBy('users.organization')
            ->get();

        return response()->json([
            'data' => $organizations,
        ]);
    }

    public function userOrganizations(Request $request)
    {
        $user = $request->user();

        $joined = $user->joinedOrganizations()
            ->select('users.id', 'users.firstName', 'users.lastName', 'users.organization', 'users.email', 'users.areaOfResponsibility', 'users.profile_photo', 'users.role')
            ->orderBy('users.organization')
            ->get();

        $followed = $user->followedOrganizations()
            ->select('users.id', 'users.firstName', 'users.lastName', 'users.organization', 'users.email', 'users.areaOfResponsibility', 'users.profile_photo', 'users.role')
            ->orderBy('users.organization')
            ->get();

        return response()->json([
            'joinedOrganizations' => $joined,
            'followedOrganizations' => $followed,
        ]);
    }

    public function organizationMembersAndFollowers(Request $request)
    {
        $user = $request->user();

        if (!$user->isOrganization() && strtolower((string) $user->role) !== 'admin') {
            return response()->json(['message' => 'Only organization accounts can access this resource'], 403);
        }

        $members = $user->members()
            ->select('users.id', 'users.firstName', 'users.lastName', 'users.organization', 'users.email', 'users.areaOfResponsibility', 'users.profile_photo', 'users.role')
            ->orderBy('users.firstName')
            ->get();

        $followers = $user->organizationFollowers()
            ->select('users.id', 'users.firstName', 'users.lastName', 'users.organization', 'users.email', 'users.areaOfResponsibility', 'users.profile_photo', 'users.role')
            ->orderBy('users.firstName')
            ->get();

        $following = $user->followedOrganizations()
            ->select('users.id', 'users.firstName', 'users.lastName', 'users.organization', 'users.email', 'users.areaOfResponsibility', 'users.profile_photo', 'users.role')
            ->orderBy('users.organization')
            ->get();

        return response()->json([
            'members' => $members,
            'followers' => $followers,
            'following' => $following,
        ]);
    }

    public function directory(Request $request)
    {
        $user = $request->user();

        $organizations = User::query()
            ->whereIn('role', User::ORGANIZATION_ROLES)
            ->select('id', 'firstName', 'lastName', 'organization', 'email', 'areaOfResponsibility', 'profile_photo', 'role')
            ->orderBy('organization')
            ->get();

        $followedIds = $user->followedOrganizations()->pluck('users.id')->toArray();
        $joinedIds = $user->joinedOrganizations()->pluck('users.id')->toArray();

        $data = $organizations->map(function ($org) use ($followedIds, $joinedIds) {
            return [
                'id' => $org->id,
                'firstName' => $org->firstName,
                'lastName' => $org->lastName,
                'organization' => $org->organization,
                'email' => $org->email,
                'areaOfResponsibility' => $org->areaOfResponsibility,
                'profile_photo' => $org->profile_photo,
                'role' => $org->role,
                'is_following' => in_array($org->id, $followedIds, true),
                'is_member' => in_array($org->id, $joinedIds, true),
            ];
        })->values();

        return response()->json([
            'data' => $data,
        ]);
    }

    public function getOrganizationProfile(Request $request, int $orgId)
    {
        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        $isFollowing = $user->followedOrganizations()->where('users.id', $organization->id)->exists();
        $isMember = OrganizationMembership::query()
            ->where('user_id', $user->id)
            ->where('organization_user_id', $organization->id)
            ->exists();

        $settings = OrganizationSetting::query()->firstOrCreate(
            ['organization_user_id' => $organization->id],
            ['auto_accept_join_requests' => false]
        );

        $recentUpdates = OrganizationUpdate::query()
            ->where('organization_user_id', $organization->id)
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $followersCount = DB::table('organization_followers')
            ->where('organization_user_id', $organization->id)
            ->count();

        $membersCount = OrganizationMembership::query()
            ->where('organization_user_id', $organization->id)
            ->count();

        $joinRequest = OrganizationJoinRequest::query()
            ->where('requester_user_id', $user->id)
            ->where('organization_user_id', $organization->id)
            ->orderByDesc('created_at')
            ->first();

        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'firstName' => $organization->firstName,
                'lastName' => $organization->lastName,
                'organization' => $organization->organization,
                'email' => $organization->email,
                'areaOfResponsibility' => $organization->areaOfResponsibility,
                'profile_photo' => $organization->profile_photo,
                'role' => $organization->role,
                'followers_count' => $followersCount,
                'members_count' => $membersCount,
            ],
            'is_following' => $isFollowing,
            'is_member' => $isMember,
            'join_request' => $joinRequest ? [
                'id' => $joinRequest->id,
                'status' => $joinRequest->status,
            ] : null,
            'auto_accept_join_requests' => $settings->auto_accept_join_requests,
            'updates' => $recentUpdates,
        ]);
    }

    public function getJoinSettings(Request $request, int $orgId)
    {
        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        if (!$this->canModerateOrganization($user, $organization)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $settings = OrganizationSetting::query()->firstOrCreate(
            ['organization_user_id' => $organization->id],
            ['auto_accept_join_requests' => false]
        );

        return response()->json([
            'organization_id' => $organization->id,
            'auto_accept_join_requests' => $settings->auto_accept_join_requests,
        ]);
    }

    public function updateJoinSettings(Request $request, int $orgId)
    {
        $validated = $request->validate([
            'auto_accept_join_requests' => 'required|boolean',
        ]);

        $user = $request->user();
        $organization = $this->findOrganizationOrFail($orgId);

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        if (!$this->canModerateOrganization($user, $organization)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $settings = OrganizationSetting::query()->updateOrCreate(
            ['organization_user_id' => $organization->id],
            ['auto_accept_join_requests' => (bool) $validated['auto_accept_join_requests']]
        );

        return response()->json([
            'message' => 'Join settings updated successfully',
            'organization_id' => $organization->id,
            'auto_accept_join_requests' => $settings->auto_accept_join_requests,
        ]);
    }

    public function publishUpdate(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:5000',
            'update_type' => 'nullable|string|in:update,announcement,event',
            'is_published' => 'nullable|boolean',
        ]);

        $organization = $request->user();

        if (!$organization->isOrganization()) {
            return response()->json(['message' => 'Only organization accounts can publish updates'], 403);
        }

        $update = OrganizationUpdate::query()->create([
            'organization_user_id' => $organization->id,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'update_type' => $validated['update_type'] ?? 'update',
            'is_published' => $validated['is_published'] ?? true,
            'published_at' => ($validated['is_published'] ?? true) ? now() : null,
        ]);

        return response()->json([
            'message' => 'Organization update published',
            'data' => $update,
        ], 201);
    }

    public function communityFeed(Request $request)
    {
        $user = $request->user();

        $followedIds = $user->followedOrganizations()->pluck('users.id')->toArray();
        $joinedIds = $user->joinedOrganizations()->pluck('users.id')->toArray();
        $organizationIds = array_values(array_unique(array_merge($followedIds, $joinedIds)));

        if (empty($organizationIds)) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'organization_ids' => [],
                ],
            ]);
        }

        $updates = OrganizationUpdate::query()
            ->with('organization:id,firstName,lastName,organization,profile_photo,role')
            ->whereIn('organization_user_id', $organizationIds)
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($updates);
    }

    private function findOrganizationOrFail(int $orgId): ?User
    {
        return User::query()
            ->where('id', $orgId)
            ->whereIn('role', User::ORGANIZATION_ROLES)
            ->first();
    }

    private function canModerateOrganization(User $user, User $organization): bool
    {
        if ((int) $user->id === (int) $organization->id) {
            return true;
        }

        return strtolower((string) $user->role) === 'admin';
    }
}
