<?php

namespace App\Console\Commands;

use App\Models\Device;
use App\Services\DeviceActivityLogService;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckDeviceOffline extends Command
{
    protected $signature = 'device:check-offline';
    protected $description = 'Mark devices as offline if not seen for 2+ hours';

    public function handle(NotificationService $notificationService, DeviceActivityLogService $activityLogService): int
    {
        $threshold = now()->subHours(2);

        $offlineDevices = Device::query()
            ->whereNotNull('paired_at')
            ->where(function ($query) use ($threshold) {
                $query->whereNull('last_seen_at')
                    ->orWhere('last_seen_at', '<', $threshold);
            })
            ->where('status', '!=', 'offline')
            ->get();

        foreach ($offlineDevices as $device) {
            $device->status = 'offline';
            $device->save();

            $notificationService->notifyDeviceOffline($device);
            $activityLogService->logOfflineMarked($device);

            Log::info('device.marked_offline', [
                'device_id' => $device->id,
                'station_id' => $device->station_id,
            ]);
        }

        $onlineDevices = Device::query()
            ->whereNotNull('paired_at')
            ->where('last_seen_at', '>=', $threshold)
            ->where('status', 'offline')
            ->get();

        foreach ($onlineDevices as $device) {
            $oldStatus = $device->status;
            $device->status = 'paired';
            $device->save();

            $activityLogService->logStatusChanged($device, $oldStatus, 'paired');
        }

        $this->info("Marked {$offlineDevices->count()} devices offline, {$onlineDevices->count()} back online.");
        return self::SUCCESS;
    }
}
