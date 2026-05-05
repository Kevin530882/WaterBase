<?php

namespace App\Services;

use App\Enums\NotificationType;
use App\Jobs\FanOutUserNotificationJob;
use App\Models\Device;
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

    public function notifyOrganizationApproved(User $user, ?User $actor = null): void
    {
        if (!$this->enabled()) {
            return;
        }

        $this->dispatchFanOut(
            type: NotificationType::REPORT_STATUS_CHANGED,
            recipientIds: [$user->id],
            severity: 'success',
            title: 'Organization account approved',
            message: sprintf('Your organization account for "%s" has been approved. You can now log in and use all features.', $user->organization),
            metadata: [
                'actor' => $this->buildActor($actor),
                'target_id' => (string) $user->id,
                'target_type' => 'user',
                'template_vars' => [
                    'organization' => $user->organization,
                    'status' => 'approved',
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'org-approved-' . $user->id
        );
    }

    public function notifyOrganizationRejected(User $user, ?string $notes = null, ?User $actor = null): void
    {
        if (!$this->enabled()) {
            return;
        }

        $this->dispatchFanOut(
            type: NotificationType::REPORT_STATUS_CHANGED,
            recipientIds: [$user->id],
            severity: 'warning',
            title: 'Organization account rejected',
            message: $notes
                ? sprintf('Your organization account for "%s" has been rejected. Reason: %s', $user->organization, $notes)
                : sprintf('Your organization account for "%s" has been rejected.', $user->organization),
            metadata: [
                'actor' => $this->buildActor($actor),
                'target_id' => (string) $user->id,
                'target_type' => 'user',
                'template_vars' => [
                    'organization' => $user->organization,
                    'status' => 'rejected',
                    'notes' => $notes,
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'org-rejected-' . $user->id . '-' . sha1($notes ?? '')
        );
    }

    public function notifyEventReminder(Event $event, ?string $customMessage = null, ?User $actor = null): void
    {
        if (!$this->enabled()) {
            return;
        }

        $recipientIds = collect([$event->user_id])
            ->merge($event->attendees()->pluck('users.id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($customMessage) {
            $title = 'Message from organizer';
            $message = $customMessage;
        } else {
            $title = 'Reminder: Upcoming cleanup event';
            $message = sprintf(
                '"%s" is scheduled for %s at %s. Location: %s. See you there!',
                $event->title,
                $event->date?->format('F j, Y') ?? 'soon',
                $event->time?->format('g:i A') ?? 'TBD',
                $event->address
            );
        }

        $this->dispatchFanOut(
            type: NotificationType::EVENT_REMINDER,
            recipientIds: $recipientIds,
            severity: 'info',
            title: $title,
            message: $message,
            metadata: [
                'actor' => $this->buildActor($actor),
                'target_id' => (string) $event->id,
                'target_type' => 'event',
                'template_vars' => [
                    'event_title' => $event->title,
                    'event_date' => $event->date?->toDateString(),
                    'event_time' => $event->time?->format('H:i'),
                    'event_address' => $event->address,
                    'custom_message' => $customMessage,
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'event-reminder-' . $event->id . '-' . sha1($customMessage ?? 'default')
        );
    }

    public function notifyDeviceMaintenanceDue(Device $device, int $daysUntilDue): void
    {
        if (!$this->enabled()) {
            return;
        }

        $recipientIds = collect([$device->paired_by_user_id])
            ->merge(User::where('role', 'admin')->pluck('id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $severity = $daysUntilDue < 0 ? 'warning' : 'info';
        $title = $daysUntilDue < 0
            ? 'Device calibration overdue'
            : 'Device calibration due soon';
        $message = $daysUntilDue < 0
            ? sprintf('Device "%s" calibration is overdue by %d days.', $device->name ?? $device->station_id, abs($daysUntilDue))
            : sprintf('Device "%s" calibration is due in %d days.', $device->name ?? $device->station_id, $daysUntilDue);

        $this->dispatchFanOut(
            type: NotificationType::DEVICE_MAINTENANCE_DUE,
            recipientIds: $recipientIds,
            severity: $severity,
            title: $title,
            message: $message,
            metadata: [
                'target_id' => (string) $device->id,
                'target_type' => 'device',
                'template_vars' => [
                    'device_name' => $device->name,
                    'station_id' => $device->station_id,
                    'days_until_due' => $daysUntilDue,
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'device-maintenance-' . $device->id . '-' . now()->format('Y-m-d')
        );
    }

    public function notifyDeviceAnomalyDetected(Device $device, array $reasons): void
    {
        if (!$this->enabled()) {
            return;
        }

        $recipientIds = collect([$device->paired_by_user_id])
            ->merge(User::where('role', 'admin')->pluck('id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $this->dispatchFanOut(
            type: NotificationType::DEVICE_ANOMALY_DETECTED,
            recipientIds: $recipientIds,
            severity: 'warning',
            title: 'Device anomaly detected',
            message: sprintf(
                'Anomaly detected on "%s": %s.',
                $device->name ?? $device->station_id,
                implode(', ', $reasons)
            ),
            metadata: [
                'target_id' => (string) $device->id,
                'target_type' => 'device',
                'template_vars' => [
                    'device_name' => $device->name,
                    'station_id' => $device->station_id,
                    'reasons' => $reasons,
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'device-anomaly-' . $device->id . '-' . sha1(implode(',', $reasons))
        );
    }

    public function notifyDeviceOffline(Device $device): void
    {
        if (!$this->enabled()) {
            return;
        }

        $recipientIds = collect([$device->paired_by_user_id])
            ->merge(User::where('role', 'admin')->pluck('id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $this->dispatchFanOut(
            type: NotificationType::DEVICE_OFFLINE,
            recipientIds: $recipientIds,
            severity: 'warning',
            title: 'Device offline',
            message: sprintf(
                'Device "%s" has not reported in over 2 hours and is marked offline.',
                $device->name ?? $device->station_id
            ),
            metadata: [
                'target_id' => (string) $device->id,
                'target_type' => 'device',
                'template_vars' => [
                    'device_name' => $device->name,
                    'station_id' => $device->station_id,
                    'last_seen_at' => $device->last_seen_at?->toISOString(),
                ],
                'channel' => 'in_app',
            ],
            idempotencySeed: 'device-offline-' . $device->id . '-' . now()->format('Y-m-d-H')
        );
    }

    private function enabled(): bool
    {
        return (bool) config('services.waterbase_notifications.enabled', true);
    }
}
