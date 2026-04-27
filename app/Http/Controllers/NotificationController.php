<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function getPreferences(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'push_notifications_enabled' => (bool) $user->push_notifications_enabled,
            'report_updates' => (bool) $user->push_pref_report_updates,
            'event_reminders' => (bool) $user->push_pref_event_reminders,
            'achievements' => (bool) $user->push_pref_achievements,
            'quiet_hours_enabled' => (bool) $user->push_quiet_hours_enabled,
            'quiet_hours_start' => $user->push_quiet_hours_start,
            'quiet_hours_end' => $user->push_quiet_hours_end,
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'push_notifications_enabled' => 'sometimes|boolean',
            'report_updates' => 'sometimes|boolean',
            'event_reminders' => 'sometimes|boolean',
            'achievements' => 'sometimes|boolean',
            'quiet_hours_enabled' => 'sometimes|boolean',
            'quiet_hours_start' => ['nullable', 'string', 'regex:/^([01]\\d|2[0-3]):[0-5]\\d$/'],
            'quiet_hours_end' => ['nullable', 'string', 'regex:/^([01]\\d|2[0-3]):[0-5]\\d$/'],
        ]);

        if (($validated['quiet_hours_enabled'] ?? $user->push_quiet_hours_enabled) === true) {
            $start = $validated['quiet_hours_start'] ?? $user->push_quiet_hours_start;
            $end = $validated['quiet_hours_end'] ?? $user->push_quiet_hours_end;

            if (empty($start) || empty($end)) {
                return response()->json([
                    'message' => 'quiet_hours_start and quiet_hours_end are required when quiet hours are enabled',
                ], 422);
            }
        }

        $map = [
            'push_notifications_enabled' => 'push_notifications_enabled',
            'report_updates' => 'push_pref_report_updates',
            'event_reminders' => 'push_pref_event_reminders',
            'achievements' => 'push_pref_achievements',
            'quiet_hours_enabled' => 'push_quiet_hours_enabled',
            'quiet_hours_start' => 'push_quiet_hours_start',
            'quiet_hours_end' => 'push_quiet_hours_end',
        ];

        foreach ($map as $inputKey => $userKey) {
            if (array_key_exists($inputKey, $validated)) {
                $user->{$userKey} = $validated[$inputKey];
            }
        }

        $user->save();

        return response()->json([
            'message' => 'Notification preferences updated',
            'preferences' => [
                'push_notifications_enabled' => (bool) $user->push_notifications_enabled,
                'report_updates' => (bool) $user->push_pref_report_updates,
                'event_reminders' => (bool) $user->push_pref_event_reminders,
                'achievements' => (bool) $user->push_pref_achievements,
                'quiet_hours_enabled' => (bool) $user->push_quiet_hours_enabled,
                'quiet_hours_start' => $user->push_quiet_hours_start,
                'quiet_hours_end' => $user->push_quiet_hours_end,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|string|max:80',
            'channel' => 'nullable|string|max:32',
            'read' => 'nullable|boolean',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest();

        if (!empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (!empty($validated['channel'])) {
            $query->where('channel', $validated['channel']);
        }

        if (array_key_exists('read', $validated)) {
            $validated['read']
                ? $query->whereNotNull('read_at')
                : $query->whereNull('read_at');
        }

        $notifications = $query->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json($notifications);
    }

    public function markReadState(Request $request, UserNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'read' => 'required|boolean',
        ]);

        $notification->read_at = $validated['read'] ? now() : null;
        $notification->save();

        return response()->json([
            'message' => 'Notification state updated',
            'notification' => $notification,
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updated = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read',
            'updated' => $updated,
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread_count' => $count]);
    }
}
