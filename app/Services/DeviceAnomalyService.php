<?php

namespace App\Services;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use Illuminate\Support\Facades\Log;

class DeviceAnomalyService
{
    public function __construct(
        protected NotificationService $notificationService,
        protected DeviceActivityLogService $activityLogService,
    )
    {
    }

    public function checkLatestTelemetry(Device $device): void
    {
        $telemetry = $device->latestTelemetry;
        if (!$telemetry instanceof DeviceTelemetry) {
            return;
        }

        $reasons = $this->isAnomalous($telemetry);

        if ($this->isFlatlined($device)) {
            $reasons[] = 'flatlined_readings';
        }

        if (!empty($reasons)) {
            $this->recordAnomaly($device, $reasons);
            $this->notifyAnomaly($device, $reasons);
            $this->activityLogService->logAnomalyDetected($device, $reasons);
        }
    }

    public function isAnomalous(DeviceTelemetry $telemetry): array
    {
        $reasons = [];

        if ($telemetry->ph !== null && ($telemetry->ph < 0 || $telemetry->ph > 14)) {
            $reasons[] = 'ph_out_of_range';
        }

        if ($telemetry->tds_mg_l !== null && $telemetry->tds_mg_l < 0) {
            $reasons[] = 'tds_negative';
        }

        if ($telemetry->turbidity_ntu !== null && $telemetry->turbidity_ntu < 0) {
            $reasons[] = 'turbidity_negative';
        }

        if ($telemetry->temperature_celsius !== null && ($telemetry->temperature_celsius < -10 || $telemetry->temperature_celsius > 60)) {
            $reasons[] = 'temperature_out_of_range';
        }

        return $reasons;
    }

    public function isFlatlined(Device $device): bool
    {
        $recent = $device->telemetry()
            ->orderByDesc('recorded_at')
            ->limit(5)
            ->get();

        if ($recent->count() < 5) {
            return false;
        }

        $metrics = ['ph', 'tds_mg_l', 'turbidity_ntu', 'temperature_celsius'];

        foreach ($metrics as $metric) {
            $values = $recent->pluck($metric)->filter(fn ($v) => $v !== null);
            if ($values->count() >= 5 && $values->unique()->count() === 1) {
                return true;
            }
        }

        return false;
    }

    public function recordAnomaly(Device $device, array $reasons): void
    {
        $flags = $device->anomaly_flags ?? [];
        $flags[] = [
            'reasons' => $reasons,
            'recorded_at' => now()->toISOString(),
        ];

        // Keep only last 20 entries to avoid bloat
        $device->anomaly_flags = array_slice($flags, -20);
        $device->save();
    }

    public function notifyAnomaly(Device $device, array $reasons): void
    {
        $this->notificationService->notifyDeviceAnomalyDetected($device, $reasons);

        Log::info('anomaly.notified', [
            'device_id' => $device->id,
            'station_id' => $device->station_id,
            'reasons' => $reasons,
        ]);
    }
}
