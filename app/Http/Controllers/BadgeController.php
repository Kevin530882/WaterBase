<?php

namespace App\Http\Controllers;

use App\Models\Badge;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class BadgeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Upload badge icon image
     */
    public function uploadIcon(Request $request)
    {
        if (($request->user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'icon' => 'required|image|max:2048',
        ]);

        $file = $request->file('icon');
        $fileName = 'badge_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        $path = Storage::disk('public')->putFileAs('badge_icons', $file, $fileName);

        return response()->json(['icon_url' => '/storage/' . $path], 201);
    }

    /**
     * Get all badges with current user's earned status
     */
    public function index()
    {
        $user = Auth::user();

        if (!$user instanceof User) {
            return response()->json(['message' => 'User not authenticated'], 401);
        }

        $badges = Badge::all()->map(function ($badge) use ($user) {
            $userBadge = $user->badges()->where('badge_id', $badge->id)->first();
            return [
                'id' => $badge->id,
                'name' => $badge->name,
                'description' => $badge->description,
                'icon_url' => $badge->icon_url,
                'type' => $badge->type,
                'criteria' => $badge->criteria,
                'earned' => $userBadge !== null,
                'earned_at' => $userBadge?->pivot->earned_at,
                'issued_at' => $userBadge?->pivot->issued_at,
            ];
        });

        return response()->json(['data' => $badges]);
    }

    /**
     * Get badges for a specific user
     */
    public function userBadges($userId)
    {
        $user = User::findOrFail($userId);
        $badges = $user->badges()
            ->select('badges.*')
            ->selectRaw("IF(revoked_at IS NULL, 'active', 'revoked') as status")
            ->get()
            ->map(function ($badge) {
                return [
                    'id' => $badge->id,
                    'name' => $badge->name,
                    'description' => $badge->description,
                    'icon_url' => $badge->icon_url,
                    'type' => $badge->type,
                    'earned_at' => $badge->pivot->earned_at,
                    'issued_at' => $badge->pivot->issued_at,
                    'status' => $badge->status,
                ];
            });

        return response()->json(['data' => $badges]);
    }

    /**
     * Issue a badge to a user (admin only)
     */
    public function issueBadge(Request $request)
    {
        if (($request->user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'badge_id' => 'required|exists:badges,id',
            'notes' => 'nullable|string',
        ]);

        $user = User::findOrFail($validated['user_id']);
        Badge::findOrFail($validated['badge_id']);

        $user->badges()->syncWithoutDetaching([
            $validated['badge_id'] => [
                'issued_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]
        ]);

        return response()->json(['message' => 'Badge issued successfully'], 201);
    }

    /**
     * Auto-issue a badge (system operation)
     */
    public function autoIssueBadge(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'badge_id' => 'required|exists:badges,id',
            'notes' => 'nullable|string',
        ]);

        $user = User::findOrFail($validated['user_id']);

        $user->badges()->syncWithoutDetaching([
            $validated['badge_id'] => [
                'earned_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]
        ]);

        return response()->json(['message' => 'Badge auto-issued successfully'], 201);
    }

    /**
     * Revoke a badge from a user (admin only)
     */
    public function revokeBadge(Request $request, $userId, $badgeId)
    {
        if (($request->user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = User::findOrFail($userId);
        Badge::findOrFail($badgeId);

        $user->badges()->updateExistingPivot($badgeId, [
            'revoked_at' => now(),
        ]);

        return response()->json(['message' => 'Badge revoked successfully']);
    }

    /**
     * Create a new badge (admin only)
     */
    public function store(Request $request)
    {
        if (($request->user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon_url' => 'nullable|string',
            'type' => 'required|in:auto,manual',
            'criteria' => 'nullable|array',
        ]);

        $badge = Badge::create($validated);

        return response()->json(['data' => $badge], 201);
    }

    /**
     * Update a badge (admin only)
     */
    public function update(Request $request, $badgeId)
    {
        if (($request->user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $badge = Badge::findOrFail($badgeId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'icon_url' => 'sometimes|nullable|string',
            'type' => 'sometimes|in:auto,manual',
            'criteria' => 'sometimes|nullable|array',
        ]);

        $badge->update($validated);

        return response()->json(['data' => $badge]);
    }

    /**
     * Delete a badge (admin only)
     */
    public function destroy(Request $request, $badgeId)
    {
        if (($request->user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $badge = Badge::findOrFail($badgeId);
        $badge->delete();

        return response()->json(['message' => 'Badge deleted successfully']);
    }
}
