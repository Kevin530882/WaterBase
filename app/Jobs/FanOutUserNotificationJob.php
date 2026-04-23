<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class FanOutUserNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public string $type,
        public array $recipientIds,
        public string $channel,
        public string $severity,
        public string $title,
        public string $message,
        public array $metadata,
        public ?string $idempotencySeed = null
    ) {
    }

    public function backoff(): array
    {
        return [5, 30, 120];
    }

    public function handle(): void
    {
        foreach ($this->recipientIds as $recipientId) {
            DeliverUserNotificationJob::dispatch(
                userId: (int) $recipientId,
                type: $this->type,
                channel: $this->channel,
                severity: $this->severity,
                title: $this->title,
                message: $this->message,
                metadata: $this->metadata,
                idempotencyKey: $this->buildIdempotencyKey((int) $recipientId)
            );
        }
    }

    private function buildIdempotencyKey(int $recipientId): string
    {
        $seed = $this->idempotencySeed ?? sha1(json_encode($this->metadata));

        return sha1(implode('|', [
            $this->type,
            $this->channel,
            $recipientId,
            $seed,
        ]));
    }
}
