<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\BadgeEvaluationService;
use App\Services\GeographicService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    protected GeographicService $geographicService;
    protected BadgeEvaluationService $badgeEvaluationService;

    public function __construct(GeographicService $geographicService, BadgeEvaluationService $badgeEvaluationService)
    {
        $this->geographicService = $geographicService;
        $this->badgeEvaluationService = $badgeEvaluationService;
    }

    public function register(Request $request)
    {
        try {
            $validated = $request->validate([
                'firstName' => 'required|string|max:255',
                'lastName' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8|confirmed',
                'phoneNumber' => 'required|string|max:15',
                'role' => 'required|string|in:user,admin,ngo,lgu,researcher,volunteer',
                'organization' => 'nullable|string|max:255',
                'organization_proof_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
                'areaOfResponsibility' => 'nullable|string|max:255',
            ]);

            $isOrganizationRole = in_array($validated['role'], ['ngo', 'lgu', 'researcher'], true);

            if ($isOrganizationRole && empty(trim((string) ($validated['organization'] ?? '')))) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => [
                        'organization' => ['Organization name is required for organization accounts.'],
                    ],
                ], 422);
            }

            if ($isOrganizationRole && !$request->hasFile('organization_proof_document')) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => [
                        'organization_proof_document' => ['Proof of legitimacy document is required for organization accounts.'],
                    ],
                ], 422);
            }

            $organizationProofPath = null;
            if ($request->hasFile('organization_proof_document')) {
                $organizationProofPath = $request->file('organization_proof_document')
                    ->store('organization_proofs', 'public');
            }

            $user = User::create([
                'firstName' => $validated['firstName'],
                'lastName' => $validated['lastName'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'phoneNumber' => $validated['phoneNumber'],
                'role' => $validated['role'],
                'organization' => $validated['organization'] ?? null,
                'organization_proof_document' => $organizationProofPath ? '/storage/' . $organizationProofPath : null,
                'areaOfResponsibility' => $validated['areaOfResponsibility'] ?? null,
            ]);

            if ($isOrganizationRole && !empty($validated['areaOfResponsibility'])) {
                Log::info('Registering area of responsibility for new organization', [
                    'user_id' => $user->id,
                    'organization' => $validated['organization'] ?? null,
                    'area' => $validated['areaOfResponsibility'],
                ]);

                $geoResult = $this->geographicService->registerAreaOfResponsibility(
                    $user->id,
                    $validated['areaOfResponsibility']
                );

                if (!$geoResult['success']) {
                    Log::warning('Failed to geocode area during registration', [
                        'user_id' => $user->id,
                        'area' => $request->areaOfResponsibility,
                        'error' => $geoResult['error'],
                    ]);
                } else {
                    Log::info('Successfully geocoded area during registration', [
                        'user_id' => $user->id,
                        'bounding_box' => $geoResult['bounding_box'],
                    ]);
                }
            }

            return response()->json([
                'message' => 'User registered successfully',
                'user' => $user,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Registration failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    public function registerPushToken(Request $request)
    {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' => 'User not authenticated',
            ], 401);
        }

        $validated = $request->validate([
            'token' => 'required|string|max:255',
            'platform' => 'nullable|string|in:ios,android,web,unknown',
            'app_version' => 'nullable|string|max:32',
        ]);

        $user->expo_push_token = $validated['token'];
        $user->push_token_platform = $validated['platform'] ?? 'unknown';
        $user->push_token_app_version = $validated['app_version'] ?? null;
        $user->push_token_updated_at = now();
        $user->save();

        return response()->json([
            'message' => 'Push token registered',
            'push_notifications_enabled' => (bool) $user->push_notifications_enabled,
            'push_token_updated_at' => $user->push_token_updated_at,
        ]);
    }

    public function revokePushToken(Request $request)
    {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' => 'User not authenticated',
            ], 401);
        }

        $validated = $request->validate([
            'token' => 'nullable|string|max:255',
        ]);

        $requestedToken = $validated['token'] ?? null;

        if ($requestedToken !== null && $user->expo_push_token !== $requestedToken) {
            return response()->json([
                'message' => 'Token does not match current device token',
            ], 422);
        }

        $user->expo_push_token = null;
        $user->push_token_platform = null;
        $user->push_token_app_version = null;
        $user->push_token_updated_at = now();
        $user->save();

        return response()->json([
            'message' => 'Push token revoked',
        ]);
    }

    public function getOrganizations()
    {
        try {
            $organizations = User::query()
                ->whereNotNull('organization')
                ->where('organization', '!=', '')
                ->pluck('organization')
                ->map(fn ($name) => trim((string) $name))
                ->filter(fn ($name) => $name !== '')
                ->unique()
                ->values();

            return response()->json([
                'message' => 'Organizations retrieved successfully',
                'data' => $organizations,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve organizations', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to retrieve organizations',
            ], 500);
        }
    }

    public function updateProfile(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user instanceof User) {
                return response()->json([
                    'message' => 'User not authenticated',
                ], 401);
            }

            $validated = $request->validate([
                'firstName' => 'sometimes|string|max:255',
                'lastName' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $user->id,
                'phoneNumber' => 'sometimes|string|max:20',
                'organization' => 'sometimes|string|max:255',
                'areaOfResponsibility' => 'sometimes|string|max:255',
                'profile_photo' => 'sometimes|image|mimes:jpeg,png,jpg,gif|max:5120',
            ]);

            $profilePhotoPath = null;

            if ($request->hasFile('profile_photo')) {
                if ($user->profile_photo) {
                    $oldPath = str_replace('/storage/', '', $user->profile_photo);
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }

                $file = $request->file('profile_photo');
                $fileName = 'profile_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $profilePhotoPath = $file->storeAs('profile_photos', $fileName, 'public');
            }

            unset($validated['profile_photo']);
            $user->fill($validated);

            if ($profilePhotoPath) {
                $user->profile_photo = '/storage/' . $profilePhotoPath;
            }

            $user->save();
            $user->refresh();

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $user,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getStats(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user instanceof User) {
                return response()->json([
                    'message' => 'User not authenticated',
                ], 401);
            }

            $role = strtolower($user->role);
            $stats = [];
            $issuedBadgeNames = $user->badges()
                ->wherePivotNull('revoked_at')
                ->pluck('badges.name')
                ->map(fn ($name) => trim((string) $name))
                ->filter(fn ($name) => $name !== '')
                ->values()
                ->toArray();

            switch ($role) {
                case 'volunteer':
                    $reportsCount = \App\Models\Report::where('user_id', $user->id)->count();
                    $eventsJoined = 0;
                    $badgesEarned = 0;
                    $communityPoints = 0;
                    $totalHours = 0;
                    $userBadges = [];

                    if (class_exists('\App\Models\Event')) {
                        $eventsJoined = $user->attendedEvents()->count();

                        $completedEvents = $user->attendedEvents()
                            ->where('status', 'completed')
                            ->whereNotNull('badge')
                            ->get();

                        $allAttendedEvents = $user->attendedEvents()->get();
                        $totalHours = $allAttendedEvents->sum('duration') ?? 0;

                        $userBadges = $completedEvents->pluck('badge')->unique()->values()->toArray();
                        $userBadges = collect($userBadges)
                            ->merge($issuedBadgeNames)
                            ->unique()
                            ->values()
                            ->toArray();
                        $badgesEarned = count($userBadges);

                        $communityPoints = $completedEvents->sum('points') ?? 0;
                        $communityPoints += ($reportsCount * 10);
                    }

                    $stats = [
                        'reportsSubmitted' => $reportsCount,
                        'eventsJoined' => $eventsJoined,
                        'badgesEarned' => $badgesEarned,
                        'communityPoints' => $communityPoints,
                        'totalHours' => $totalHours,
                        'badges' => $userBadges,
                    ];
                    break;

                case 'ngo':
                case 'lgu':
                    $eventsCreated = 0;
                    $eventsCompleted = 0;
                    $volunteersManaged = 0;

                    if (class_exists('\App\Models\Event')) {
                        $eventsCreated = \App\Models\Event::where('user_id', $user->id)->count();
                        $eventsCompleted = \App\Models\Event::where('user_id', $user->id)
                            ->where('status', 'completed')
                            ->count();
                        $volunteersManaged = \App\Models\Event::where('user_id', $user->id)
                            ->sum('currentVolunteers') ?? 0;
                    }

                    $successRate = $eventsCreated > 0 ? round(($eventsCompleted / $eventsCreated) * 100) : 0;

                    $stats = [
                        'eventsCreated' => $eventsCreated,
                        'eventsCompleted' => $eventsCompleted,
                        'volunteersManaged' => $volunteersManaged,
                        'accuracyRate' => $successRate,
                        'badgesEarned' => count($issuedBadgeNames),
                        'badges' => $issuedBadgeNames,
                    ];
                    break;

                case 'researcher':
                    $reportsSubmitted = \App\Models\Report::where('user_id', $user->id)->count();

                    $stats = [
                        'dataAnalyzed' => $reportsSubmitted * 2,
                        'researchPublished' => max(1, intval($reportsSubmitted / 5)),
                        'reportsSubmitted' => $reportsSubmitted,
                        'accuracyRate' => 95,
                        'badgesEarned' => count($issuedBadgeNames),
                        'badges' => $issuedBadgeNames,
                    ];
                    break;

                case 'admin':
                    $stats = [
                        'reportsSubmitted' => \App\Models\Report::where('user_id', $user->id)->count(),
                        'badgesEarned' => count($issuedBadgeNames),
                        'badges' => $issuedBadgeNames,
                    ];
                    break;

                default:
                    $reportsSubmitted = \App\Models\Report::where('user_id', $user->id)->count();

                    $stats = [
                        'reportsSubmitted' => $reportsSubmitted,
                        'communityPoints' => $reportsSubmitted * 10,
                    ];
                    break;
            }

            $newBadges = $this->badgeEvaluationService->evaluateAndAward($user);
            if (!empty($newBadges)) {
                if (isset($stats['badges'])) {
                    $stats['badges'] = array_merge($stats['badges'], $newBadges);
                } else {
                    $stats['badges'] = $newBadges;
                }
                if (isset($stats['badgesEarned'])) {
                    $stats['badgesEarned'] += count($newBadges);
                }
            }

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Error in getStats: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'message' => 'Failed to fetch stats',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}