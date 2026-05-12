<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\Event;
use App\Models\EventCleanupEvidence;
use App\Models\OrganizationUpdate;
use App\Models\User;
use Illuminate\Validation\Rules\Enum;
use App\Enums\EventStatus;
use App\Services\BadgeEvaluationService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EventController extends Controller
{
    private const EVENT_TIMEZONE = 'Asia/Manila';

    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly BadgeEvaluationService $badgeEvaluationService,
    ) {
    }

    public function index(Request $request)
    {
        try {
            $query = Event::query()
                ->with('creator:id,firstName,lastName,organization,profile_photo,role');

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

        $eventDate = Carbon::parse($validated['date'])->toDateString();
        $eventDateTime = Carbon::createFromFormat('Y-m-d H:i', "{$eventDate} {$validated['time']}", self::EVENT_TIMEZONE);

        if ($eventDateTime->lessThanOrEqualTo(now(self::EVENT_TIMEZONE))) {
            throw ValidationException::withMessages([
                'time' => ['Event time must be later than the current time.'],
            ]);
        }

        // Set default status if not provided
        if (!isset($validated['status'])) {
            $validated['status'] = 'recruiting';
        }

        $event = Event::create($validated)->load('creator');

        $this->publishEventUpdate(
            event: $event,
            title: 'Cleanup drive posted: ' . $event->title,
            content: sprintf(
                '%s is organizing a cleanup drive at %s on %s.',
                $this->organizationDisplayName($event->creator),
                $event->address,
                $event->date?->format('M j, Y') ?? $event->date
            )
        );

        $this->notificationService->notifyEventCreated(
            event: $event,
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

            $releasedReports = 0;
            $restoredReports = 0;

            $event->linkedReports()->each(function ($report) use (&$releasedReports, &$restoredReports) {
                if ((string) $report->status === 'resolved') {
                    $report->status = 'verified';
                    $restoredReports++;
                }

                $report->event_id = null;
                $report->save();
                $releasedReports++;
            });

            $event->reportGroup()
                ->where('cleanup_event_id', $event->id)
                ->update([
                    'cleanup_event_id' => null,
                    'is_active' => true,
                ]);

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
                'released_reports' => $releasedReports,
                'restored_reports' => $restoredReports,
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
                ->withPivot(['is_present', 'qr_scanned_at', 'joined_at', 'task_note'])
                ->orderBy('date', 'desc')
                ->get();

            return response()->json($joinedEvents);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch user events'], 500);
        }
    }

    public function getCreatedEvents(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user instanceof User) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $createdEvents = Event::query()
                ->with('creator:id,firstName,lastName,organization,profile_photo,role')
                ->where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($createdEvents);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch created events'], 500);
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
                        'task_note' => $user->pivot->task_note,
                        'pivot' => [
                            'user_id' => $user->id,
                            'event_id' => $event->id,
                            'created_at' => $user->pivot->created_at ?? now()->toISOString(),
                            'is_present' => (bool) ($user->pivot->is_present ?? false),
                            'qr_scanned_at' => $user->pivot->qr_scanned_at,
                            'task_note' => $user->pivot->task_note,
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

    public function updateVolunteerTaskNote(Request $request, string $id, string $userId)
    {
        try {
            $event = Event::findOrFail($id);

            if ($event->user_id !== Auth::id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!$event->attendees()->where('users.id', $userId)->exists()) {
                return response()->json(['message' => 'Volunteer is not joined to this event'], 404);
            }

            $validated = $request->validate([
                'task_note' => 'nullable|string|max:500',
            ]);

            $event->attendees()->updateExistingPivot((int) $userId, [
                'task_note' => $validated['task_note'] ?? null,
            ]);

            return response()->json([
                'message' => 'Volunteer task note updated',
                'task_note' => $validated['task_note'] ?? null,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
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

            if ($user->role !== 'volunteer') {
                return response()->json([
                    'message' => 'Check-in not allowed',
                    'details' => 'Only volunteers can check in for cleanup events'
                ], 403);
            }

            if (!in_array($event->status, ['recruiting', 'active'])) {
                return response()->json([
                    'message' => 'Check-in not available',
                    'details' => "This event is {$event->status} and is no longer accepting check-ins"
                ], 400);
            }

            if (!$event->attendees()->where('user_id', $user->id)->exists()) {
                return response()->json([
                    'message' => 'Join required',
                    'details' => 'You must join this event before scanning the attendance QR code.'
                ], 403);
            }

            $event->attendees()->updateExistingPivot($user->id, [
                'is_present' => true,
                'qr_scanned_at' => now(),
            ]);

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
            $event->cleanup_verification_status = 'pending';
            $event->cleanup_verified_at = null;
            $event->cleanup_verified_by = null;
            $event->cleanup_verification_notes = 'Cleanup completed. Awaiting after-cleanup photo evidence.';
            $event->save();
            $event->load('creator');

            $linkedReportsCount = $event->linkedReports()->count();

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

            $this->publishEventUpdate(
                event: $event,
                title: 'Cleanup completed: ' . $event->title,
                content: sprintf(
                    '%s completed a cleanup drive at %s. %d linked reports are awaiting cleanup proof and %d volunteers checked in.',
                    $this->organizationDisplayName($event->creator),
                    $event->address,
                    $linkedReportsCount,
                    $presentAttendees->count()
                )
            );

            Log::info('Event completed', [
                'event_id' => $event->id,
                'completed_by' => Auth::id(),
                'linked_reports_pending_verification' => $linkedReportsCount,
                'present_attendees' => $presentAttendees->count(),
            ]);

            return response()->json([
                'success' => 'Event completed successfully',
                'event' => $event->fresh(),
                'resolved_reports' => 0,
                'linked_reports_pending_verification' => $linkedReportsCount,
                'present_attendees' => $presentAttendees->count(),
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function cleanupEvidence(Request $request, string $id)
    {
        try {
            $event = Event::with('cleanupEvidences.submitter:id,firstName,lastName,email,role')->findOrFail($id);

            if (!$this->canViewCleanupEvidence($event, $request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            return response()->json([
                'event_id' => $event->id,
                'cleanup_verification_status' => $event->cleanup_verification_status,
                'cleanup_verified_at' => $event->cleanup_verified_at,
                'cleanup_verification_notes' => $event->cleanup_verification_notes,
                'evidences' => $event->cleanupEvidences()
                    ->with('submitter:id,firstName,lastName,email,role')
                    ->latest()
                    ->get(),
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    public function storeCleanupEvidence(Request $request, string $id)
    {
        try {
            $event = Event::findOrFail($id);
            $user = $request->user();

            if (!$user instanceof User) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (!in_array($event->status, ['active', 'completed'], true)) {
                return response()->json(['message' => 'Cleanup evidence can only be submitted for active or completed events'], 422);
            }

            if (!$this->canSubmitCleanupEvidence($event, $user)) {
                return response()->json(['message' => 'Only checked-in volunteers, the organizer, researchers, or admins can submit cleanup evidence'], 403);
            }

            $validated = $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg|max:10120',
                'latitude' => 'nullable|numeric|between:-90,90',
                'longitude' => 'nullable|numeric|between:-180,180',
            ]);

            $file = $request->file('image');
            $fileName = $this->makeCleanupEvidenceFileName($file);
            $path = Storage::disk('public')->putFileAs('cleanup_evidence', $file, $fileName);
            $imagePath = Storage::url($path);
            $imageFullPath = Storage::disk('public')->path($path);

            $analysis = $this->analyzeCleanupEvidenceImage($imageFullPath, $request);
            $result = $this->cleanupEvidencePasses($analysis) ? 'approved' : 'failed';

            $evidence = null;
            DB::transaction(function () use ($event, $user, $validated, $imagePath, $analysis, $result, &$evidence) {
                $evidence = EventCleanupEvidence::create([
                    'event_id' => $event->id,
                    'submitted_by' => $user->id,
                    'image' => $imagePath,
                    'ai_annotated_image' => $analysis['annotated_image_path'] ?? null,
                    'latitude' => $validated['latitude'] ?? null,
                    'longitude' => $validated['longitude'] ?? null,
                    'ai_severity' => $analysis['severity_level'] ?? 'medium',
                    'ai_confidence' => (float) ($analysis['overall_confidence'] ?? 0),
                    'pollution_percentage' => (float) ($analysis['pollution_percentage'] ?? 0),
                    'ai_verified' => (bool) ($analysis['ai_verified'] ?? false),
                    'result' => $result,
                    'notes' => $result === 'approved'
                        ? 'After-cleanup image passed AI cleanliness check.'
                        : 'After-cleanup image still shows pollution. Reports were returned to the eligible pool.',
                ]);

                if ($result === 'approved') {
                    $resolvedCount = 0;
                    $event->linkedReports()->where('status', '!=', 'resolved')->each(function ($report) use (&$resolvedCount) {
                        $report->status = 'resolved';
                        $report->save();
                        $resolvedCount++;
                    });

                    $event->cleanup_verification_status = 'approved';
                    $event->cleanup_verified_at = now();
                    $event->cleanup_verified_by = $user->id;
                    $event->cleanup_verification_notes = "Cleanup verified by after-photo evidence. {$resolvedCount} reports resolved.";
                    $event->save();
                } else {
                    $releasedCount = 0;
                    $event->linkedReports()->each(function ($report) use (&$releasedCount) {
                        if ((string) $report->status === 'resolved') {
                            $report->status = 'verified';
                        }

                        if (!in_array((string) $report->status, ['pending', 'declined'], true)) {
                            $report->status = 'verified';
                        }

                        $report->event_id = null;
                        $report->save();
                        $releasedCount++;
                    });

                    $event->reportGroup()
                        ->where('cleanup_event_id', $event->id)
                        ->update([
                            'cleanup_event_id' => null,
                            'is_active' => true,
                        ]);

                    $event->cleanup_verification_status = 'failed';
                    $event->cleanup_verified_at = now();
                    $event->cleanup_verified_by = $user->id;
                    $event->cleanup_verification_notes = "Cleanup evidence did not pass AI cleanliness check. {$releasedCount} reports returned for future cleanup.";
                    $event->save();
                }
            });

            return response()->json([
                'message' => $result === 'approved'
                    ? 'Cleanup evidence approved. Linked reports were resolved.'
                    : 'Cleanup evidence needs more work. Linked reports were returned to eligible areas.',
                'result' => $result,
                'cleanup_verification_status' => $event->fresh()->cleanup_verification_status,
                'evidence' => $evidence?->fresh('submitter:id,firstName,lastName,email,role'),
            ], 201);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Event not found'], 404);
        }
    }

    private function publishEventUpdate(Event $event, string $title, string $content): void
    {
        $organization = $event->creator;

        if (!$organization instanceof User || !$organization->isOrganization()) {
            return;
        }

        OrganizationUpdate::query()->create([
            'organization_user_id' => $organization->id,
            'title' => $title,
            'content' => $content,
            'update_type' => 'event',
            'is_published' => true,
            'published_at' => now(),
        ]);
    }

    private function organizationDisplayName(?User $organization): string
    {
        if (!$organization) {
            return 'An organization';
        }

        return $organization->organization ?: trim("{$organization->firstName} {$organization->lastName}");
    }

    private function canViewCleanupEvidence(Event $event, ?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (in_array(strtolower((string) $user->role), ['admin', 'researcher'], true)) {
            return true;
        }

        if ($event->user_id === $user->id) {
            return true;
        }

        return $event->attendees()->where('users.id', $user->id)->exists();
    }

    private function canSubmitCleanupEvidence(Event $event, User $user): bool
    {
        if (in_array(strtolower((string) $user->role), ['admin', 'researcher'], true)) {
            return true;
        }

        if ($event->user_id === $user->id) {
            return true;
        }

        return $event->attendees()
            ->where('users.id', $user->id)
            ->wherePivot('is_present', true)
            ->exists();
    }

    private function makeCleanupEvidenceFileName($file): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        if (!in_array($extension, ['jpg', 'jpeg', 'png'], true)) {
            $extension = 'jpg';
        }

        $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeBaseName = Str::slug($baseName) ?: 'cleanup-evidence';

        return now()->format('YmdHis') . '_' . Str::uuid() . '_' . $safeBaseName . '.' . $extension;
    }

    private function analyzeCleanupEvidenceImage(string $imageFullPath, Request $request): array
    {
        if (app()->environment('testing') && $request->has('test_ai_severity')) {
            return [
                'severity_level' => $request->input('test_ai_severity', 'low'),
                'pollution_percentage' => (float) $request->input('test_pollution_percentage', 0),
                'overall_confidence' => (float) $request->input('test_ai_confidence', 95),
                'ai_verified' => true,
                'annotated_image_path' => null,
            ];
        }

        set_time_limit(600);

        $python = base_path('python_environment/Scripts/python.exe');
        $script = base_path('scripts/predict_pollution.py');
        $workingDir = base_path();
        $cmd = "cd /d \"$workingDir\" && \"$python\" \"$script\" \"$imageFullPath\"";
        Log::info('Cleanup evidence Python command: ' . $cmd);
        $output = shell_exec($cmd);
        Log::info('Cleanup evidence Python output: ' . $output);

        if (!$output) {
            return [
                'severity_level' => 'medium',
                'pollution_percentage' => 100,
                'overall_confidence' => 0,
                'ai_verified' => false,
                'annotated_image_path' => null,
            ];
        }

        $lines = explode("\n", trim($output));
        $jsonLine = end($lines);
        $predictions = json_decode($jsonLine, true);

        if (!is_array($predictions)) {
            Log::error('Cleanup evidence JSON decode failed', ['json' => $jsonLine]);
            return [
                'severity_level' => 'medium',
                'pollution_percentage' => 100,
                'overall_confidence' => 0,
                'ai_verified' => false,
                'annotated_image_path' => null,
            ];
        }

        return array_merge([
            'severity_level' => 'medium',
            'pollution_percentage' => 100,
            'overall_confidence' => 0,
            'ai_verified' => false,
            'annotated_image_path' => null,
        ], $predictions);
    }

    private function cleanupEvidencePasses(array $analysis): bool
    {
        $severity = strtolower((string) ($analysis['severity_level'] ?? 'medium'));
        $pollutionPercentage = (float) ($analysis['pollution_percentage'] ?? 100);

        return $severity === 'low' || $pollutionPercentage <= 10;
    }
}
