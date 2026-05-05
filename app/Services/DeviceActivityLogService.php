<?php

namespace App\Services;

use App\Models\Device;
use App\Models\DeviceActivityLog;

class DeviceActivityLogService
{
    public function log(Device $device, string $eventType, ?int $userId = null, ?string $description = null, array $metadata = []): DeviceActivityLog
    {
        return $device->activityLogs()->create([
            'user_id' => $userId,
            'event_type' => $eventType,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }

    public function logTelemetryReceived(Device $device, array $telemetryPayload): void
    {
        $this->log($device, 'telemetry_received', null, 'Telemetry received from device', [
            'ph' => $telemetryPayload['ph'] ?? null,
            'temperature_celsius' => $telemetryPayload['temperature_celsius'] ?? null,
            'tds_mg_l' => $telemetryPayload['tds_mg_l'] ?? null,
            'turbidity_ntu' => $telemetryPayload['turbidity_ntu'] ?? null,
        ]);
    }

    public function logCommandSent(Device $device, string $commandType, ?int $userId = null): void
    {
        $this->log($device, 'command_sent', $userId, "Command '{$commandType}' sent to device", [
            'command_type' => $commandType,
        ]);
    }

    public function logPaired(Device $device, int $userId): void
    {
        $this->log($device, 'paired', $userId, 'Device paired', [
            'station_id' => $device->station_id,
            'latitude' => $device->latitude,
            'longitude' => $device->longitude,
        ]);
    }

    public function logCalibrationRecorded(Device $device, int $userId, ?string $notes = null): void
    {
        $this->log($device, 'calibration_recorded', $userId, 'Calibration recorded', [
            'notes' => $notes,
        ]);
    }

    public function logAnomalyDetected(Device $device, array $reasons): void
    {
        $this->log($device, 'anomaly_detected', null, 'Anomaly detected: ' . implode(', ', $reasons), [
            'reasons' => $reasons,
        ]);
    }

    public function logStatusChanged(Device $device, string $oldStatus, string $newStatus): void
    {
        $this->log($device, 'status_changed', null, "Status changed from {$oldStatus} to {$newStatus}", [
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
        ]);
    }

    public function logLocationUpdated(Device $device, ?int $userId = null): void
    {
        $this->log($device, 'location_updated', $userId, 'Location updated', [
            'latitude' => $device->latitude,
            'longitude' => $device->longitude,
        ]);
    }

    public function logMaintenanceDue(Device $device, int $daysUntilDue): void
    {
        $this->log($device, 'maintenance_due', null, "Maintenance due in {$daysUntilDue} days", [
            'days_until_due' => $daysUntilDue,
        ]);
    }

    public function logOfflineMarked(Device $device): void
    {
        $this->log($device, 'offline_marked', null, 'Device marked offline', [
            'last_seen_at' => $device->last_seen_at?->toISOString(),
        ]);
    }
}
