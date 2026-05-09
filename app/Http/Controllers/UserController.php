<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\BadgeEvaluationService;
use App\Services\GeographicService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use App\Mail\OrganizationPendingApproval;
use Laravel\Socialite\Facades\Socialite;

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

            $isOrganizationRole = in_array($validated['role'], User::ORGANIZATION_ROLES, true);

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
                'approval_status' => $isOrganizationRole ? User::STATUS_PENDING : User::STATUS_APPROVED,
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

            // Notify organization email that registration is pending approval
            if ($isOrganizationRole) {
                try {
                    Mail::to($user->email)->queue(new OrganizationPendingApproval($user));
                } catch (\Throwable $e) {
                    Log::error('Failed to queue organization pending email', ['error' => $e->getMessage(), 'user_id' => $user->id]);
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

        if ($user->isOrganization() && $user->approval_status !== User::STATUS_APPROVED) {
            $statusLabel = $user->approval_status === User::STATUS_REJECTED ? 'rejected' : 'pending';
            return response()->json([
                'message' => 'Your organization account is under review. Please wait for admin approval before logging in.',
                'approval_status' => $statusLabel,
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $this->userForAuthResponse($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if ($user) {
            $token = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                [
                    'token' => Hash::make($token),
                    'created_at' => now(),
                ]
            );

            $resetUrl = rtrim(config('app.url'), '/') . '/reset-password?token=' . urlencode($token) . '&email=' . urlencode($user->email);

            try {
                Mail::raw(
                    "You requested a WaterBase password reset.\n\nOpen this link to set a new password:\n{$resetUrl}\n\nThis link expires in " . config('auth.passwords.users.expire', 60) . " minutes.",
                    function ($message) use ($user) {
                        $message->to($user->email)->subject('Reset your WaterBase password');
                    }
                );
            } catch (\Throwable $e) {
                Log::error('Failed to send password reset email', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $validated['email'])->first();
        $expiresAt = now()->subMinutes((int) config('auth.passwords.users.expire', 60));

        if (!$record || !$record->created_at || Carbon::parse($record->created_at)->lt($expiresAt) || !Hash::check($validated['token'], $record->token)) {
            return response()->json([
                'message' => 'This password reset link is invalid or has expired.',
            ], 422);
        }

        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            return response()->json([
                'message' => 'This password reset link is invalid or has expired.',
            ], 422);
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        return response()->json([
            'message' => 'Password reset successfully. You can now sign in with your new password.',
        ]);
    }

    public function redirectToGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
            $user = $this->findOrCreateGoogleVolunteer(
                $googleUser->getEmail(),
                $googleUser->getId(),
                $googleUser->getName(),
                $googleUser->getAvatar()
            );

            $token = $user->createToken('auth_token')->plainTextToken;
            $frontendUrl = rtrim(config('app.url'), '/') . '/auth/google/callback';

            return redirect()->away($frontendUrl . '?token=' . urlencode($token));
        } catch (\Throwable $e) {
            Log::error('Google OAuth callback failed', ['error' => $e->getMessage()]);

            return redirect()->away(rtrim(config('app.url'), '/') . '/login?oauth_error=google');
        }
    }

    public function googleMobile(Request $request)
    {
        $validated = $request->validate([
            'id_token' => 'required|string',
        ]);

        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $validated['id_token'],
        ]);

        if (!$response->successful()) {
            return response()->json(['message' => 'Invalid Google token'], 401);
        }

        $payload = $response->json();
        $allowedAudiences = array_filter([
            config('services.google.client_id'),
            config('services.google.mobile_client_id'),
            config('services.google.ios_client_id'),
            config('services.google.android_client_id'),
        ]);

        if (!empty($allowedAudiences) && !in_array($payload['aud'] ?? null, $allowedAudiences, true)) {
            return response()->json(['message' => 'Invalid Google token audience'], 401);
        }

        if (!in_array($payload['email_verified'] ?? false, [true, 'true', '1', 1], true)) {
            return response()->json(['message' => 'Google email must be verified'], 422);
        }

        $user = $this->findOrCreateGoogleVolunteer(
            $payload['email'] ?? null,
            $payload['sub'] ?? null,
            $payload['name'] ?? null,
            $payload['picture'] ?? null
        );

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $this->userForAuthResponse($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function completeProfile(Request $request)
    {
        $validated = $request->validate([
            'phoneNumber' => 'required|string|max:15',
        ]);

        $user = $request->user();
        $user->phoneNumber = $validated['phoneNumber'];
        $user->profile_completed_at = now();
        $user->save();

        return response()->json([
            'user' => $this->userForAuthResponse($user),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    private function userForAuthResponse(User $user): User
    {
        $user->setAttribute('profile_completed', $this->isProfileComplete($user));

        return $user;
    }

    private function isProfileComplete(User $user): bool
    {
        return !empty(trim((string) $user->phoneNumber));
    }

    private function findOrCreateGoogleVolunteer(?string $email, ?string $googleId, ?string $name, ?string $avatar): User
    {
        if (!$email || !$googleId) {
            throw ValidationException::withMessages([
                'google' => ['Google did not return the required account information.'],
            ]);
        }

        $nameParts = preg_split('/\s+/', trim((string) $name), 2);
        $firstName = $nameParts[0] ?: 'WaterBase';
        $lastName = $nameParts[1] ?? 'Volunteer';

        $user = User::where('google_id', $googleId)->orWhere('email', $email)->first();

        if (!$user) {
            return User::create([
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
                'phoneNumber' => '',
                'role' => 'volunteer',
                'approval_status' => User::STATUS_APPROVED,
                'google_id' => $googleId,
                'avatar' => $avatar,
                'email_verified_at' => now(),
            ]);
        }

        $user->google_id = $user->google_id ?: $googleId;
        $user->avatar = $user->avatar ?: $avatar;
        $user->email_verified_at = $user->email_verified_at ?: now();

        if ($this->isProfileComplete($user) && !$user->profile_completed_at) {
            $user->profile_completed_at = now();
        }

        $user->save();

        return $user;
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
