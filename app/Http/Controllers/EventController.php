<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\Event;
use App\Models\User;
use Illuminate\Validation\Rules\Enum;
use App\Enums\EventStatus;
use App\Services\BadgeEvaluationService;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class EventController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly BadgeEvaluationService $badgeEvaluationService,
    ) {
    }

    public function index(Request $request)
    {
        try {
            $query = Event::query();

            // Filter by user_id if provided
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            $events = $query->orderBy('created_at', 'desc')->get();
            return response()->json($events);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'No events found'], 404);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'address' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'date' => 'required|date',
            'time' => 'required|date_format:H:i',
            'duration' => 'required|numeric|min:0.1|max:24',
            'description' => 'required|string',
            'maxVolunteers' => 'required|integer|min:1',
            'points' => 'required|integer|min:0',
            'badge' => 'required|string',
            'status' => ['sometimes', new Enum(EventStatus::class)],
            'user_id' => 'required|integer|exists:users,id',
        ]);

        // Set default status if not provided
        if (!isset($validated['status'])) {
            $validated['status'] = 'recruiting';
        }

        $event = Event::create($validated);

        $this->notificationService->notifyEventCreated(
            event: $event->load('creator'),
            actor: Auth::user()
        );

        return response()->json([
            'success' => 'Event Created Successfully',
            'event' => $event
        ], 201);
    }

    public function show(string $id)
    {
        try {
            $event = Event::findOrFail($id);
            return response()->json($event);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);

            // Check if user owns this event
            if ($event->user_id !== Auth::id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'date' => 'sometimes|required|date',
                'time' => 'sometimes|required|date_format:H:i',
                'duration' => 'sometimes|required|numeric|min:0.1|max:24',
                'description' => 'sometimes|nullable|string',
                'maxVolunteers' => 'sometimes|required|integer|min:1',
                'points' => 'sometimes|required|integer|min:0',
                'badge' => 'sometimes|nullable|string|max:255',
                'status' => ['sometimes', new Enum(EventStatus::class)],
            ]);

            $oldStatus = $event->status;

            $event->update($validated);

            if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
                $this->notificationService->notifyEventStatusChanged(
                    event: $event->fresh(),
                    oldStatus: (string) $oldStatus,
                    newStatus: (string) $validated['status'],
                    actor: Auth::user()
                );
            }

            return response()->json([
                'success' => 'Event Updated Successfully',
                'event' => $event->fresh()
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function destroy(string $id)
    {
        try {
            $event = Event::findOrFail($id);

            // Check if user owns this event
            if ($event->user_id !== Auth::id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $event->delete();
            return response()->json(['success' => 'Event Deleted Successfully'], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function cancel(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);

            // Check if user owns this event
            if ($event->user_id !== Auth::id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Only allow cancellation of recruiting and active events
            if (!in_array($event->status, ['recruiting', 'active'])) {
                return response()->json(['message' => 'Only recruiting or active events can be cancelled'], 400);
            }

            $oldStatus = $event->status;
            $event->status = 'cancelled';
            $event->save();

            // Notify all volunteers about the cancellation
            $this->notificationService->notifyEventStatusChanged(
                event: $event,
                oldStatus: $oldStatus,
                newStatus: 'cancelled',
                actor: Auth::user()
            );

            Log::info('Event cancelled', [
                'event_id' => $event->id,
                'old_status' => $oldStatus,
                'cancelled_by' => Auth::id(),
            ]);

            return response()->json(['success' => 'Event cancelled successfully'], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function join(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);
            $user = Auth::user();

            if (!$user instanceof User) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if ($user->role !== 'volunteer') {
                return response()->json(['message' => 'Only volunteers can join cleanup drives'], 403);
            }

            // Check if event is still recruiting
            if ($event->status !== 'recruiting') {
                return response()->json(['message' => 'This event is no longer accepting volunteers'], 400);
            }

            // Check if user is already joined
            if ($event->attendees()->where('user_id', $user->id)->exists()) {
                return response()->json(['message' => 'You have already joined this event'], 400);
            }

            // Check if event is full
            $currentVolunteers = $event->attendees()->count();
            if ($currentVolunteers >= $event->maxVolunteers) {
                return response()->json(['message' => 'This event is full'], 400);
            }

            // Add user to event
            $event->attendees()->attach($user->id, [
                'joined_at' => now(),
                'is_present' => false,
                'qr_scanned_at' => null,
            ]);

            // Update current volunteer count
            $event->currentVolunteers = $currentVolunteers + 1;
            $event->save();

            $newBadges = $this->badgeEvaluationService->evaluateAndAward($user);

            return response()->json([
                'message' => 'Successfully joined the event',
                'event' => $event->load('attendees'),
                'new_badges' => $newBadges,
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function leave(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);
            $user = Auth::user();

            if (!$user instanceof User) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (!$event->attendees()->where('user_id', $user->id)->exists()) {
                return response()->json(['message' => 'You have not joined this event'], 400);
            }

            $event->attendees()->detach($user->id);

            $event->currentVolunteers = max(0, $event->attendees()->count());
            $event->save();

            $this->notificationService->notifyVolunteerLeft(
                event: $event,
                volunteer: $user
            );

            return response()->json([
                'message' => 'Successfully left the event',
                'event' => $event->load('attendees')
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function getUserEvents(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user instanceof User) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            // Get events the user has joined
            $joinedEvents = $user->attendedEvents()
                ->with('creator')
                ->withPivot(['is_present', 'qr_scanned_at', 'joined_at'])
                ->orderBy('date', 'desc')
                ->get();

            return response()->json($joinedEvents);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch user events'], 500);
        }
    }

    public function getVolunteers($id)
    {
        try {
            $event = Event::findOrFail($id);

            // Get all volunteers for this event through the pivot table
            $volunteers = $event->attendees()
                ->select('users.id', 'users.firstName', 'users.lastName', 'users.email', 'users.phoneNumber', 'users.organization')
                ->get()
                ->map(function ($user) use ($event) {
                    return [
                        'id' => $user->id,
                        'user_id' => $user->id,
                        'firstName' => $user->firstName,
                        'lastName' => $user->lastName,
                        'name' => $user->firstName . ' ' . $user->lastName,
                        'email' => $user->email,
                        'phone' => $user->phoneNumber ?? '',
                        'organization' => $user->organization ?? '',
                        'joined_at' => $user->pivot->joined_at ?? now()->toISOString(),
                        'is_present' => (bool) ($user->pivot->is_present ?? false),
                        'qr_scanned_at' => $user->pivot->qr_scanned_at,
                        'pivot' => [
                            'user_id' => $user->id,
                            'event_id' => $event->id,
                            'created_at' => $user->pivot->created_at ?? now()->toISOString(),
                            'is_present' => (bool) ($user->pivot->is_present ?? false),
                            'qr_scanned_at' => $user->pivot->qr_scanned_at,
                        ]
                    ];
                });

            return response()->json($volunteers);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching volunteers: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch volunteers: ' . $e->getMessage()], 500);
        }
    }

    public function start(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);

            if ($event->user_id !== Auth::id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if ($event->status !== 'recruiting') {
                return response()->json(['message' => 'Only recruiting events can be started'], 400);
            }

            // Check at least 1 volunteer has checked in via QR
            $presentCount = $event->attendees()
                ->wherePivot('is_present', true)
                ->count();

            if ($presentCount < 1) {
                return response()->json([
                    'message' => 'At least one volunteer must check in via QR before starting',
                    'present_count' => $presentCount,
                ], 400);
            }

            $oldStatus = $event->status;
            $event->status = 'active';
            $event->started_at = now();
            $event->save();

            $this->notificationService->notifyEventStatusChanged(
                event: $event->fresh(),
                oldStatus: $oldStatus,
                newStatus: 'active',
                actor: Auth::user()
            );

            Log::info('Event started', [
                'event_id' => $event->id,
                'started_by' => Auth::id(),
                'present_count' => $presentCount,
            ]);

            return response()->json([
                'success' => 'Event started successfully',
                'event' => $event->fresh()
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function qrScan(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);
            $user = Auth::user();

            if (!$user instanceof User) {
                return response()->json(['message' => 'Unauthorized - Please log in to check in'], 401);
            }

            if (!in_array($event->status, ['recruiting', 'active'])) {
                return response()->json([
                    'message' => 'Check-in not available',
                    'details' => "This event is {$event->status} and is no longer accepting check-ins"
                ], 400);
            }

            // Auto-join if not already joined
            if (!$event->attendees()->where('user_id', $user->id)->exists()) {
                if ($event->status !== 'recruiting') {
                    return response()->json([
                        'message' => 'Cannot join this event',
                        'details' => 'You must have joined during the recruiting phase (before the event started) to check in now'
                    ], 400);
                }

                $currentVolunteers = $event->attendees()->count();
                if ($currentVolunteers >= $event->maxVolunteers) {
                    return response()->json([
                        'message' => 'Event is full',
                        'details' => "This event has reached its maximum capacity of {$event->maxVolunteers} volunteers"
                    ], 400);
                }

                $event->attendees()->attach($user->id, [
                    'joined_at' => now(),
                    'is_present' => true,
                    'qr_scanned_at' => now(),
                ]);

                $event->currentVolunteers = $currentVolunteers + 1;
                $event->save();
            } else {
                // Update pivot to mark present
                $event->attendees()->updateExistingPivot($user->id, [
                    'is_present' => true,
                    'qr_scanned_at' => now(),
                ]);
            }

            Log::info('QR scan attendance recorded', [
                'event_id' => $event->id,
                'user_id' => $user->id,
                'volunteer_name' => "{$user->firstName} {$user->lastName}",
            ]);

            return response()->json([
                'message' => 'Check-in successful!',
                'details' => "You've been checked in for {$event->title}",
                'event' => $event->fresh()->load('attendees')
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found', 'details' => 'This QR code appears to be invalid'], 404);
        }
    }

    public function messageVolunteers(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);

            if ($event->user_id !== Auth::id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'message' => 'sometimes|nullable|string|max:1000',
            ]);

            $customMessage = $validated['message'] ?? null;

            $this->notificationService->notifyEventReminder(
                event: $event,
                customMessage: $customMessage,
                actor: Auth::user()
            );

            Log::info('Message sent to volunteers', [
                'event_id' => $event->id,
                'has_custom_message' => !is_null($customMessage),
                'sent_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => 'Message sent to volunteers',
                'event_id' => $event->id,
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function complete(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);

            if ($event->user_id !== Auth::id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if ($event->status !== 'active') {
                return response()->json(['message' => 'Only active events can be completed'], 400);
            }

            $oldStatus = $event->status;
            $event->status = 'completed';
            $event->ended_at = now();
            $event->save();

            // Auto-resolve all linked reports
            $resolvedCount = 0;
            $event->linkedReports()->where('status', '!=', 'resolved')->each(function ($report) use (&$resolvedCount) {
                $report->status = 'resolved';
                $report->save();
                $resolvedCount++;
            });

            // Award badges to attendees who were present
            $presentAttendees = $event->attendees()
                ->wherePivot('is_present', true)
                ->get();

            foreach ($presentAttendees as $attendee) {
                $this->badgeEvaluationService->evaluateAndAward($attendee);
            }

            $this->notificationService->notifyEventStatusChanged(
                event: $event->fresh(),
                oldStatus: $oldStatus,
                newStatus: 'completed',
                actor: Auth::user()
            );

            Log::info('Event completed', [
                'event_id' => $event->id,
                'completed_by' => Auth::id(),
                'resolved_reports' => $resolvedCount,
                'present_attendees' => $presentAttendees->count(),
            ]);

            return response()->json([
                'success' => 'Event completed successfully',
                'event' => $event->fresh(),
                'resolved_reports' => $resolvedCount,
                'present_attendees' => $presentAttendees->count(),
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }
}