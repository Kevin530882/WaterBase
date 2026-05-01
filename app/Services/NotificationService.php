<?php

namespace App\Services;

use App\Enums\NotificationType;
use App\Jobs\FanOutUserNotificationJob;
use App\Models\Event;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function notifyEventCreated(Event $event, ?User $actor = null): void
    {
        if (!$this->enabled()) {
            return;
        }

        $recipientIds = collect([$event->user_id])
            ->merge($event->creator?->organizationFollowers()->pluck('users.id') ?? [])
            ->filter()
            ->unique()
            ->values()
            ->all();

        $this->dispatchFanOut(
            type: NotificationType::EVENT_CREATED,
            recipientIds: $recipientIds,
            severity: 'info',
            title: 'New cleanup event created',
            message: sprintf('"%s" was created and is now recruiting volunteers.', $event->title),
            metadata: [
                'actor' => $this->buildActor($actor),
                'target_id' => (string) $event->id,
                'target_type' => 'event',
                'template_vars' => [
                    'event_title' => $event->title,
                    'event_status' => $event->status,
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'event-created-' . $event->id
        );
    }

    public function notifyEventStatusChanged(Event $event, string $oldStatus, string $newStatus, ?User $actor = null): void
    {
        if (!$this->enabled()) {
            return;
        }

        $mappedType = match ($newStatus) {
            'active' => NotificationType::EVENT_ONGOING,
            'completed' => NotificationType::EVENT_COMPLETED,
            default => null,
        };

        if ($mappedType === null) {
            return;
        }

        $recipientIds = collect([$event->user_id])
            ->merge($event->attendees()->pluck('users.id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $this->dispatchFanOut(
            type: $mappedType,
            recipientIds: $recipientIds,
            severity: $newStatus === 'completed' ? 'success' : 'info',
            title: $newStatus === 'completed' ? 'Cleanup event completed' : 'Cleanup event is now ongoing',
            message: sprintf('Event "%s" changed from %s to %s.', $event->title, $oldStatus, $newStatus),
            metadata: [
                'actor' => $this->buildActor($actor),
                'target_id' => (string) $event->id,
                'target_type' => 'event',
                'template_vars' => [
                    'event_title' => $event->title,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'event-status-' . $event->id . '-' . $oldStatus . '-' . $newStatus
        );
    }

    public function notifyReportStatusChanged(
        Report $report,
        ?string $oldStatus,
        string $newStatus,
        ?User $actor = null,
        array $extra = []
    ): void {
        if (!$this->enabled()) {
            return;
        }

        $this->dispatchFanOut(
            type: NotificationType::REPORT_STATUS_CHANGED,
            recipientIds: [$report->user_id],
            severity: $newStatus === 'declined' ? 'warning' : 'info',
            title: 'Report status updated',
            message: sprintf(
                'Your report "%s" status changed to %s.',
                $report->title,
                $newStatus
            ),
            metadata: [
                'actor' => $this->buildActor($actor),
                'target_id' => (string) $report->id,
                'target_type' => 'report',
                'template_vars' => [
                    'report_title' => $report->title,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ],
                'channel' => 'in_app',
                'extra' => $extra,
            ],
            idempotencySeed: 'report-status-' . $report->id . '-' . ($oldStatus ?? 'none') . '-' . $newStatus . '-' . sha1(json_encode($extra))
        );
    }

    public function notifyReportProcessingFailed(User $recipient, string $reason, ?User $actor = null, ?string $targetId = null): void
    {
        if (!$this->enabled()) {
            return;
        }

        $this->dispatchFanOut(
            type: NotificationType::REPORT_PROCESSING_FAILED,
            recipientIds: [$recipient->id],
            severity: 'error',
            title: 'Report processing failed',
            message: 'We could not process your report. Please retry your submission.',
            metadata: [
                'actor' => $this->buildActor($actor),
                'target_id' => $targetId,
                'target_type' => 'report',
                'template_vars' => [
                    'reason' => $reason,
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'report-failed-' . $recipient->id . '-' . sha1($reason . '|' . ($targetId ?? ''))
        );
    }

    public function notifyReportInfoRequested(Report $report, string $requestDetails, ?User $actor = null): void
    {
        if (!$this->enabled()) {
            return;
        }

        $this->dispatchFanOut(
            type: NotificationType::REPORT_STATUS_CHANGED,
            recipientIds: [$report->user_id],
            severity: 'info',
            title: 'More information needed on your report',
            message: sprintf(
                'We need more information about your report "%s" before it can be processed.',
                $report->title
            ),
            metadata: [
                'actor' => $this->buildActor($actor),
                'target_id' => (string) $report->id,
                'target_type' => 'report',
                'template_vars' => [
                    'report_title' => $report->title,
                    'request_details' => $requestDetails,
                    'reason' => $requestDetails,
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'report-info-requested-' . $report->id . '-' . sha1($requestDetails)
        );
    }

    private function dispatchFanOut(
        NotificationType $type,
        array $recipientIds,
        string $severity,
        string $title,
        string $message,
        array $metadata,
        string $idempotencySeed
    ): void {
        $recipientIds = array_values(array_unique(array_filter(array_map('intval', $recipientIds))));

        if (empty($recipientIds)) {
            Log::warning('notification.no_recipients', [
                'type' => $type->value,
                'seed' => $idempotencySeed,
            ]);
            return;
        }

        try {
            FanOutUserNotificationJob::dispatch(
                type: $type->value,
                recipientIds: $recipientIds,
                channel: 'in_app',
                severity: $severity,
                title: $title,
                message: $message,
                metadata: $metadata,
                idempotencySeed: $idempotencySeed
            );
        } catch (\Throwable $e) {
            // Notification enqueue failures should not block primary business flows.
            Log::error('notification.enqueue_failed', [
                'type' => $type->value,
                'recipient_count' => count($recipientIds),
                'queue' => config('queue.default'),
                'error' => $e->getMessage(),
            ]);

            return;
        }

        Log::info('notification.enqueued', [
            'type' => $type->value,
            'recipient_count' => count($recipientIds),
            'queue' => config('queue.default'),
        ]);
    }

    private function buildActor(?User $actor): ?array
    {
        if ($actor === null) {
            return null;
        }

        return [
            'id' => $actor->id,
            'name' => trim(($actor->firstName ?? '') . ' ' . ($actor->lastName ?? '')),
            'role' => $actor->role,
        ];
    }

    public function notifyVolunteerLeft(Event $event, User $volunteer): void
    {
        if (!$this->enabled()) {
            return;
        }

        $this->dispatchFanOut(
            type: NotificationType::EVENT_VOLUNTEER_CANCELLED,
            recipientIds: [$event->user_id],
            severity: 'info',
            title: 'Volunteer left cleanup event',
            message: sprintf(
                '%s %s left "%s".',
                $volunteer->firstName,
                $volunteer->lastName,
                $event->title
            ),
            metadata: [
                'actor' => $this->buildActor($volunteer),
                'target_id' => (string) $event->id,
                'target_type' => 'event',
                'template_vars' => [
                    'event_title' => $event->title,
                    'volunteer_name' => trim(($volunteer->firstName ?? '') . ' ' . ($volunteer->lastName ?? '')),
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'volunteer-left-' . $event->id . '-' . $volunteer->id
        );
    }

    private function enabled(): bool
    {
        return (bool) config('services.waterbase_notifications.enabled', true);
    }
}
