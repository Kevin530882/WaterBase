<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Services\GeographicService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    protected GeographicService $geographicService;

    public function __construct(GeographicService $geographicService)
    {
        $this->geographicService = $geographicService;
    }

    public function register(Request $request)
    {
        try {
            $request->validate([
                'firstName' => 'required|string|max:255',
                'lastName' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8|confirmed',
                'phoneNumber' => 'required|string|max:15',
                'role' => 'required|string|in:user,admin,ngo,lgu,researcher,volunteer',
                'organization' => 'nullable|string|max:255',
                'areaOfResponsibility' => 'nullable|string|max:255',
            ]);

            $user = User::create([
                'firstName' => $request->firstName,
                'lastName' => $request->lastName,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phoneNumber' => $request->phoneNumber,
                'role' => $request->role,
                'organization' => $request->organization,
                'areaOfResponsibility' => $request->areaOfResponsibility,
            ]);

            // If user is an organization (NGO, LGU, researcher) and has an area of responsibility,
            // automatically geocode and populate bounding boxes
            if (in_array($request->role, ['ngo', 'lgu', 'researcher']) && $request->areaOfResponsibility) {
                Log::info('Registering area of responsibility for new organization', [
                    'user_id' => $user->id,
                    'organization' => $request->organization,
                    'area' => $request->areaOfResponsibility
                ]);

                $geoResult = $this->geographicService->registerAreaOfResponsibility(
                    $user->id,
                    $request->areaOfResponsibility
                );

                if (!$geoResult['success']) {
                    Log::warning('Failed to geocode area during registration', [
                        'user_id' => $user->id,
                        'area' => $request->areaOfResponsibility,
                        'error' => $geoResult['error']
                    ]);
                    // Note: We don't fail the registration if geocoding fails
                    // The user can update their area later via the geographic API
                } else {
                    Log::info('Successfully geocoded area during registration', [
                        'user_id' => $user->id,
                        'bounding_box' => $geoResult['bounding_box']
                    ]);
                }
            }

            return response()->json([
                'message' => 'User registered successfully',
                'user' => $user
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Registration failed',
                'error' => $e->getMessage()
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
                'message' => 'Invalid credentials'
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
            'message' => 'Successfully logged out'
        ]);
    }

    public function updateProfile(Request $request)
    {
        try {
            $user = Auth::user();

            $validated = $request->validate([
                'firstName' => 'sometimes|string|max:255',
                'lastName' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $user->id,
                'phoneNumber' => 'sometimes|string|max:20',
                'organization' => 'sometimes|string|max:255',
                'areaOfResponsibility' => 'sometimes|string|max:255',
            ]);

            $user->update($validated);

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $user
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'message' => 'User not authenticated'
                ], 401);
            }

            $role = strtolower($user->role);

            $stats = [];

            switch ($role) {
                case 'volunteer':
                    // Count reports submitted by user
                    $reportsCount = \App\Models\Report::where('user_id', $user->id)->count();

                    // Get events joined by user
                    $eventsJoined = 0;
                    $badgesEarned = 0;
                    $communityPoints = 0;
                    $userBadges = [];

                    if (class_exists('\App\Models\Event')) {
                        // Count events the user has joined
                        $eventsJoined = $user->attendedEvents()->count();

                        // Get completed events and their badges
                        $completedEvents = $user->attendedEvents()
                            ->where('status', 'completed')
                            ->whereNotNull('badge')
                            ->get();

                        // Count unique badges earned
                        $userBadges = $completedEvents->pluck('badge')->unique()->values()->toArray();
                        $badgesEarned = count($userBadges);

                        // Calculate community points from completed events
                        $communityPoints = $completedEvents->sum('points') ?? 0;

                        // Add points from reports
                        $communityPoints += ($reportsCount * 10);
                    }

                    $stats = [
                        'reportsSubmitted' => $reportsCount,
                        'eventsJoined' => $eventsJoined,
                        'badgesEarned' => $badgesEarned,
                        'communityPoints' => $communityPoints,
                        'badges' => $userBadges
                    ];
                    break;
                case 'ngo':
                case 'lgu':
                    // Count events created by user (if Event model exists)
                    $eventsCreated = 0;
                    $eventsCompleted = 0;
                    $volunteersManaged = 0;

                    // Check if Event model exists
                    if (class_exists('\App\Models\Event')) {
                        $eventsCreated = \App\Models\Event::where('user_id', $user->id)->count();
                        $eventsCompleted = \App\Models\Event::where('user_id', $user->id)
                            ->where('status', 'completed')->count();
                        $volunteersManaged = \App\Models\Event::where('user_id', $user->id)
                            ->sum('currentVolunteers') ?? 0;
                    }

                    // Calculate success rate
                    $successRate = $eventsCreated > 0 ? round(($eventsCompleted / $eventsCreated) * 100) : 0;

                    $stats = [
                        'eventsCreated' => $eventsCreated,
                        'eventsCompleted' => $eventsCompleted,
                        'volunteersManaged' => $volunteersManaged,
                        'accuracyRate' => $successRate
                    ];
                    break;

                case 'researcher':
                    // Count reports submitted by researcher
                    $reportsSubmitted = \App\Models\Report::where('user_id', $user->id)->count();

                    $stats = [
                        'dataAnalyzed' => $reportsSubmitted * 2,
                        'researchPublished' => max(1, intval($reportsSubmitted / 5)),
                        'reportsSubmitted' => $reportsSubmitted,
                        'accuracyRate' => 95
                    ];
                    break;

                default:
                    // Default stats for basic users
                    $reportsSubmitted = \App\Models\Report::where('user_id', $user->id)->count();

                    $stats = [
                        'reportsSubmitted' => $reportsSubmitted,
                        'communityPoints' => $reportsSubmitted * 10
                    ];
                    break;
            }

            return response()->json($stats);

        } catch (\Exception $e) {
            \Log::error('Error in getStats: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'message' => 'Failed to fetch stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}