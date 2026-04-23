<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
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
