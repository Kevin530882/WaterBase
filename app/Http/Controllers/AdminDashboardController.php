<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\User;
use App\Models\Event;
use App\Models\Report;
use Illuminate\Http\Request;
use App\Services\GeographicService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class AdminDashboardController extends Controller
{
    protected GeographicService $geographicService;

    public function __construct(GeographicService $geographicService)
    {
        $this->geographicService = $geographicService;
    }

    public function getPendingReports(Request $request)
    {
        try 
        {
            $query = Report::where('status', 'pending');

            // Apply filters
            
            if ($request->has('pollutionType') && !($request->pollutionType == "all")) {
                $query->where('pollutionType', $request->pollutionType);
            }
            if ($request->has('severityByUser')  && !($request->severityByUser == "all")) {
                $query->where('severityByUser', $request->severityByUser);
            }
            if ($request->has('severityByAI') && !($request->severityByAI == "all")) {
                $query->where('severityByAI', $request->severityByAI);
            }
            if ($request->has('aiConfidenceMin')) {
                $query->where('ai_confidence', '>=', $request->aiConfidenceMin);
            }
            if ($request->has('aiConfidenceMax')) {
                $query->where('ai_confidence', '<=', $request->aiConfidenceMax);
            }
            if ($request->has('dateFrom')) {
                $query->whereDate('created_at', '>=', $request->dateFrom);
            }
            if ($request->has('dateTo')) {
                $query->whereDate('created_at', '<=', $request->dateTo);
            }
            if ($request->has('submitter')) {
                $query->whereHas('user', function ($q) use ($request) {
                    $q->whereRaw("CONCAT(firstName, ' ', lastName) LIKE ?", ['%' . $request->submitter . '%']);
                });
            }

            // Fetch paginated reports with their related users
            $reports = $query->with('user')->latest()->paginate(10);

            // Map the reports to include the username
            $reports->getCollection()->transform(function ($report) {
                $report->username = $report->user->firstName . ' ' . $report->user->lastName;
                return $report;
            });

            return response()->json($reports, 200);
        } 
        catch (ModelNotFoundException $e) 
        {
            return response()->json(['message' => 'No reports found'], 404);
        }
    }

    public function updateStatus(Request $request, Report $report)
    {
        $validated = $request->validate([
            'status' => 'required|in:verified,declined',
            'verifiedBy'=> 'required',
            'admin_notes'=> 'required',
        ]);

        $report->status = $validated['status'];
        $report->admin_notes = $validated['admin_notes'];
        $report->verifiedBy = $validated['verifiedBy'];
        $report->verified_at = Carbon::now();
        $report->save();

        return response()->json(['message' => 'Report status updated successfully']);
    }
    /**
     * Display a listing of the resource.
     */
    public function getExistingUsers(Request $request)
    {
        try 
        {
            $query = User::query();

            // Apply filters
            if ($request->has('role') && !($request->role == "all")) {
                $query->where('role', $request->role);
            }
            if ($request->has('organization')) {
                $query->where('organization', 'LIKE', '%' . $request->organization . '%');
            }
            if ($request->has('area')) {
                $query->where('areaOfResponsibility', 'LIKE', '%' . $request->area . '%');
            }
            if ($request->has('joinDateFrom')) {
                $query->whereDate('created_at', '>=', $request->joinDateFrom);
            }
            if ($request->has('joinDateTo')) {
                $query->whereDate('created_at', '<=', $request->joinDateTo);
            }
            if ($request->has('minReports')) {
                $query->has('reports', '>=', $request->minReports);
            }
            if ($request->has('minEvents')) {
                $query->has('createdEvents', '>=', $request->minEvents);
            }

            // Fetch paginated users with counts
            $users = $query->withCount(['attendedEvents', 'createdEvents', 'reports'])
                ->latest()->paginate(10);

            // Transform to include additional data
            $users->getCollection()->transform(function ($user) {
                $user->attended_events_count = $user->attendedEvents()->count();
                $user->created_events_count = $user->createdEvents()->count();
                $user->total_points = $user->attendedEvents()->sum('points');
                return $user;
            });

            return response()->json($users, 200);
        } 
        catch (ModelNotFoundException $e) 
        {
            return response()->json(['message' => 'No users found'], 404);
        }
    }
    public function editExistingUser(Request $request, User $user)
    {
        try {
            // Ensure the authenticated user is an admin
            if (Auth::user()->role !== 'admin') {
                return response()->json([
                    'message' => 'Unauthorized: Only admins can update users'
                ], 403);
            }

            $validated = $request->validate([
                'firstName' => 'sometimes|string|max:255',
                'lastName' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $user->id,
                'phoneNumber' => 'sometimes|string|max:15',
                'role' => 'sometimes|string|in:user,admin,ngo,lgu,researcher,volunteer',
                'organization' => 'nullable|string|max:255',
                'areaOfResponsibility' => 'nullable|string|max:255',
            ]);

            // Update user fields
            $user->update($validated);

            // Handle geocoding for areaOfResponsibility if provided and user is NGO, LGU, or researcher
            if (isset($validated['areaOfResponsibility']) && in_array($user->role, ['ngo', 'lgu', 'researcher'])) {
                Log::info('Updating area of responsibility for user', [
                    'user_id' => $user->id,
                    'organization' => $user->organization,
                    'area' => $validated['areaOfResponsibility']
                ]);

                $geoResult = $this->geographicService->registerAreaOfResponsibility(
                    $user->id,
                    $validated['areaOfResponsibility']
                );

                if (!$geoResult['success']) {
                    Log::warning('Failed to geocode area during user update', [
                        'user_id' => $user->id,
                        'area' => $validated['areaOfResponsibility'],
                        'error' => $geoResult['error']
                    ]);
                } else {
                    Log::info('Successfully geocoded area during user update', [
                        'user_id' => $user->id,
                        'bounding_box' => $geoResult['bounding_box']
                    ]);
                }
            }

            return response()->json([
                'message' => 'User updated successfully',
                'user' => $user
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to update user: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteUser(User $user)
        {
            if (Auth::user()->role !== 'admin') {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            $user->delete();
            return response()->json(['message' => 'User deleted successfully']);
        }
        
    /**
     * Show the form for creating a new resource.
     */
    public function getEvents(Request $request)
    {
        try 
        {
            $query = Event::query();

            // Apply filters
            if ($request->has('status') && !($request->status == "all")) {
                $query->where('status', $request->status);
            }
            if ($request->has('dateFrom')) {
                $query->whereDate('date', '>=', $request->dateFrom);
            }
            if ($request->has('dateTo')) {
                $query->whereDate('date', '<=', $request->dateTo);
            }
            if ($request->has('location')) {
                $query->where('address', 'LIKE', '%' . $request->location . '%');
            }
            if ($request->has('creator')) {
                $query->whereHas('creator', function ($q) use ($request) {
                    $q->whereRaw("CONCAT(firstName, ' ', lastName) LIKE ?", ['%' . $request->creator . '%']);
                });
            }
            if ($request->has('volunteersMin')) {
                $query->where('currentVolunteers', '>=', $request->volunteersMin);
            }
            if ($request->has('volunteersMax')) {
                $query->where('currentVolunteers', '<=', $request->volunteersMax);
            }

            // Fetch paginated events with creator and attendees count
            $events = $query->with(['creator' => function ($query) {
                $query->select('id', 'firstName', 'lastName');
            }])->withCount('attendees')->orderBy('created_at', 'desc')->paginate(10);

            return response()->json($events, 200);
        } 
        catch (ModelNotFoundException $e) 
        {
            return response()->json(['message' => 'No events found'], 404);
        }
    }
    public function deleteEvent(Event $event)
        {
            if (Auth::user()->role !== 'admin') {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            $event->delete();
            return response()->json(['message' => 'event deleted successfully']);
        }

    public function getAdminStats()
    {
        // Ensure only admin users can access this endpoint
        if (Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Calculate total users
        $totalUsers = User::count();

        // Calculate total reports
        $totalReports = Report::count();

        // Calculate pending validation reports
        $pendingValidation = Report::where('status', 'pending')->count();

        // Calculate active events
        $activeEvents = Event::where('status', 'active')->count();

        // Calculate verified reports
        $verifiedReports = Report::where('status', 'verified')->count();

        // Calculate declined reports (mapped to 'rejectedReports' for frontend compatibility)
        $declinedReports = Report::where('status', 'declined')->count();

        // Calculate active volunteers (unique users attending active events)
        $activeVolunteers = User::whereHas('attendedEvents', function ($query) {
            $query->where('status', 'active');
        })->count();

        // Calculate monthly growth for users
        $currentMonthUsers = User::whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->count();
        $previousMonthUsers = User::whereMonth('created_at', Carbon::now()->subMonth()->month)
            ->whereYear('created_at', Carbon::now()->subMonth()->year)
            ->count();
        $monthlyGrowth = $previousMonthUsers > 0
            ? round((($currentMonthUsers - $previousMonthUsers) / $previousMonthUsers) * 100, 2)
            : ($currentMonthUsers > 0 ? 100 : 0);

        // Return all statistics in a JSON response
        return response()->json([
            'totalUsers' => $totalUsers,
            'totalReports' => $totalReports,
            'pendingValidation' => $pendingValidation,
            'activeEvents' => $activeEvents,
            'activeVolunteers' => $activeVolunteers,
            'verifiedReports' => $verifiedReports,
            'rejectedReports' => $declinedReports, // Using 'rejectedReports' to match frontend
            'monthlyGrowth' => $monthlyGrowth,
        ]);
    }

}
