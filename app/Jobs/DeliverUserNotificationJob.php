<?php

namespace App\Jobs;

use App\Models\UserNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
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

        Log::info('notification.delivered', [
            'notification_id' => $notification->id,
            'user_id' => $this->userId,
            'type' => $this->type,
            'channel' => $this->channel,
            'severity' => $this->severity,
        ]);
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
