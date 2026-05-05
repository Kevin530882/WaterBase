<?php

namespace App\Services;

use App\Models\Device;
use App\Models\DeviceMaintenanceLog;
use App\Models\DeviceMaintenanceSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DeviceMaintenanceService
{
    public function __construct(
        protected NotificationService $notificationService,
        protected DeviceActivityLogService $activityLogService,
    )
    {
    }

    public function createDefaultSchedule(Device $device): DeviceMaintenanceSchedule
    {
        $schedule = DeviceMaintenanceSchedule::firstOrCreate(
            ['device_id' => $device->id],
            [
                'calibration_interval_days' => 30,
                'reminder_days_before' => 14,
                'last_calibrated_at' => now(),
                'next_due_at' => now()->addDays(30),
            ]
        );

        return $schedule;
    }

    public function updateSchedule(Device $device, int $intervalDays, int $reminderDays): DeviceMaintenanceSchedule
    {
        $schedule = $device->maintenanceSchedule;
        if (!$schedule) {
            $schedule = $this->createDefaultSchedule($device);
        }

        $schedule->calibration_interval_days = $intervalDays;
        $schedule->reminder_days_before = $reminderDays;

        // Recalculate next_due_at based on last calibration + new interval
        if ($schedule->last_calibrated_at) {
            $schedule->next_due_at = Carbon::parse($schedule->last_calibrated_at)->addDays($intervalDays);
        } else {
            $schedule->next_due_at = now()->addDays($intervalDays);
        }

        $schedule->save();

        return $schedule;
    }

    public function recordCalibration(Device $device, ?int $userId = null, ?string $notes = null): DeviceMaintenanceLog
    {
        $log = $device->maintenanceLogs()->create([
            'performed_by_user_id' => $userId,
            'maintenance_type' => 'calibration',
            'notes' => $notes,
            'performed_at' => now(),
        ]);

        $schedule = $device->maintenanceSchedule;
        if ($schedule) {
            $schedule->last_calibrated_at = now();
            $schedule->next_due_at = now()->addDays($schedule->calibration_interval_days);
            $schedule->reminder_sent_at = null;
            $schedule->save();
        } else {
            $this->createDefaultSchedule($device);
        }

        $this->activityLogService->logCalibrationRecorded($device, $userId ?? 0, $notes);

        return $log;
    }

    public function getOverdueDevices(): array
    {
        return Device::query()
            ->whereNotNull('paired_at')
            ->whereHas('maintenanceSchedule', function ($query) {
                $query->where('next_due_at', '<', now());
            })
            ->with(['maintenanceSchedule', 'latestTelemetry'])
            ->get()
            ->all();
    }

    public function getUpcomingDevices(int $days = 14): array
    {
        $threshold = now()->addDays($days);

        return Device::query()
            ->whereNotNull('paired_at')
            ->whereHas('maintenanceSchedule', function ($query) use ($threshold) {
                $query->where('next_due_at', '>=', now())
                    ->where('next_due_at', '<=', $threshold);
            })
            ->with(['maintenanceSchedule', 'latestTelemetry'])
            ->get()
            ->all();
    }

    public function checkAndSendReminders(): void
    {
        $devices = Device::query()
            ->whereNotNull('paired_at')
            ->whereHas('maintenanceSchedule', function ($query) {
                $query->whereNotNull('next_due_at')
                    ->where(function ($q) {
                        $q->whereNull('reminder_sent_at')
                            ->orWhere('reminder_sent_at', '<', now()->subDay());
                    });
            })
            ->with('maintenanceSchedule')
            ->get();

        foreach ($devices as $device) {
            $schedule = $device->maintenanceSchedule;
            if (!$schedule) {
                continue;
            }

            $daysUntilDue = (int) now()->diffInDays($schedule->next_due_at, false);
            $reminderThreshold = $schedule->reminder_days_before ?? 14;

            // Only notify if within the reminder window (and not already reminded today)
            if ($daysUntilDue > $reminderThreshold) {
                continue;
            }

            $this->notificationService->notifyDeviceMaintenanceDue($device, $daysUntilDue);
            $this->activityLogService->logMaintenanceDue($device, $daysUntilDue);

            $schedule->reminder_sent_at = now();
            $schedule->save();

            Log::info('maintenance.reminder_sent', [
                'device_id' => $device->id,
                'station_id' => $device->station_id,
                'days_until_due' => $daysUntilDue,
                'reminder_threshold' => $reminderThreshold,
            ]);
        }
    }
}
