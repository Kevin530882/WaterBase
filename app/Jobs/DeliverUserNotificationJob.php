<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeliverUserNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(
        public int $userId,
        public string $type,
        public string $channel,
        public string $severity,
        public string $title,
        public string $message,
        public array $metadata,
        public string $idempotencyKey
    ) {
    }

    public function backoff(): array
    {
        return [10, 30, 120, 300];
    }

    public function handle(): void
    {
        $notification = UserNotification::firstOrCreate(
            ['idempotency_key' => $this->idempotencyKey],
            [
                'user_id' => $this->userId,
                'type' => $this->type,
                'channel' => $this->channel,
                'severity' => $this->severity,
                'title' => $this->title,
                'message' => $this->message,
                'metadata' => $this->metadata,
                'delivered_at' => now(),
                'attempts' => 1,
            ]
        );

        if (!$notification->wasRecentlyCreated) {
            return;
        }

        Cache::increment('notifications.metrics.sent', 1);

        $this->deliverPushIfEligible();

        Log::info('notification.delivered', [
            'notification_id' => $notification->id,
            'user_id' => $this->userId,
            'type' => $this->type,
            'channel' => $this->channel,
            'severity' => $this->severity,
        ]);
    }

    private function deliverPushIfEligible(): void
    {
        if (!(bool) config('services.waterbase_push.enabled', false)) {
            return;
        }

        $allowedTypes = config('services.waterbase_push.allowed_types', []);
        if (!is_array($allowedTypes) || !in_array($this->type, $allowedTypes, true)) {
            return;
        }

        $user = User::query()
            ->select([
                'id',
                'expo_push_token',
                'push_notifications_enabled',
                'push_pref_report_updates',
                'push_pref_event_reminders',
                'push_pref_achievements',
                'push_quiet_hours_enabled',
                'push_quiet_hours_start',
                'push_quiet_hours_end',
            ])
            ->find($this->userId);

        if (!$user || !$user->push_notifications_enabled || empty($user->expo_push_token)) {
            return;
        }

        if (!$this->isTypeEnabledForUser($user)) {
            return;
        }

        if ($this->isWithinQuietHours($user)) {
            Cache::increment('notifications.metrics.push_suppressed_quiet_hours', 1);
            return;
        }

        Cache::increment('notifications.metrics.push_attempted', 1);

        $response = Http::timeout(10)
            ->retry(2, 200)
            ->post((string) config('services.waterbase_push.provider_url'), [
                'to' => $user->expo_push_token,
                'title' => $this->title,
                'body' => $this->message,
                'sound' => 'default',
                'data' => [
                    'type' => $this->type,
                    'target_id' => $this->metadata['target_id'] ?? null,
                    'target_type' => $this->metadata['target_type'] ?? null,
                ],
            ]);

        $payload = $response->json();
        $data = $payload['data'] ?? null;
        $entry = null;
        if (is_array($data) && array_key_exists(0, $data)) {
            $entry = $data[0];
        } elseif (is_array($data) && array_key_exists('status', $data)) {
            $entry = $data;
        }
        $status = is_array($entry) ? ($entry['status'] ?? null) : null;
        $detailError = is_array($entry['details'] ?? null) ? ($entry['details']['error'] ?? null) : null;

        if ($detailError === 'DeviceNotRegistered') {
            $user->expo_push_token = null;
            $user->push_token_platform = null;
            $user->push_token_app_version = null;
            $user->push_token_updated_at = now();
            $user->save();

            Cache::increment('notifications.metrics.push_invalid_token', 1);
            Log::warning('notification.push_invalid_token', [
                'user_id' => $this->userId,
                'type' => $this->type,
            ]);
            return;
        }

        if ($response->successful()) {
            if ($status === 'ok') {
                Cache::increment('notifications.metrics.push_accepted', 1);
            } else {
                Cache::increment('notifications.metrics.push_failed', 1);
            }

            if (($entry['details']['delivery_status'] ?? null) === 'delivered') {
                Cache::increment('notifications.metrics.push_delivered', 1);
            } else {
                Cache::increment('notifications.metrics.push_delivered_unavailable', 1);
            }

            Log::info('notification.push_accepted', [
                'user_id' => $this->userId,
                'type' => $this->type,
                'provider_status' => $response->status(),
            ]);
            return;
        }

        Cache::increment('notifications.metrics.push_failed', 1);
        Log::warning('notification.push_failed', [
            'user_id' => $this->userId,
            'type' => $this->type,
            'provider_status' => $response->status(),
            'response_body' => $response->body(),
        ]);
    }

    private function isTypeEnabledForUser(User $user): bool
    {
        $eventTypes = ['event_created', 'event_ongoing', 'event_completed'];
        $reportTypes = ['report_status_changed', 'report_processing_failed'];

        if (in_array($this->type, $eventTypes, true)) {
            return (bool) $user->push_pref_event_reminders;
        }

        if (in_array($this->type, $reportTypes, true)) {
            return (bool) $user->push_pref_report_updates;
        }

        return (bool) $user->push_pref_achievements;
    }

    private function isWithinQuietHours(User $user): bool
    {
        if (!(bool) $user->push_quiet_hours_enabled) {
            return false;
        }

        $start = $user->push_quiet_hours_start;
        $end = $user->push_quiet_hours_end;

        if (!$start || !$end) {
            return false;
        }

        $now = now()->format('H:i');

        if ($start === $end) {
            return true;
        }

        if ($start < $end) {
            return $now >= $start && $now < $end;
        }

        return $now >= $start || $now < $end;
    }

    public function failed(?\Throwable $exception): void
    {
        Cache::increment('notifications.metrics.failed', 1);

        Log::error('notification.delivery_failed', [
            'user_id' => $this->userId,
            'type' => $this->type,
            'channel' => $this->channel,
            'error' => $exception?->getMessage(),
        ]);
    }
}
