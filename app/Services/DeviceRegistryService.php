<?php

namespace App\Services;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\User;
use Carbon\Carbon;

class DeviceRegistryService
{
    public function __construct(protected DeviceActivityLogService $activityLogService)
    {
    }

    public function registerDiscovery(array $payload): Device
    {
        $device = Device::updateOrCreate(
            ['mac_address' => $payload['mac_address']],
            [
                'name' => $payload['name'] ?? null,
                'status' => 'awaiting_pair',
                'discovery_last_seen_at' => now(),
                'firmware_version' => $payload['firmware_version'] ?? null,
                'hardware_revision' => $payload['hardware_revision'] ?? null,
                'raw_discovery_payload' => $payload,
            ]
        );

        if ($device->paired_at !== null) {
            $device->status = 'paired';
            $device->save();
        }

        return $device;
    }

    public function pairDevice(Device $device, User $user, string $stationId, ?string $name = null, ?float $latitude = null, ?float $longitude = null): Device
    {
        $device->station_id = $stationId;
        $device->name = $name ?: $device->name;
        $device->status = 'paired';
        $device->paired_by_user_id = $user->id;
        $device->paired_at = now();
        $device->latitude = $latitude;
        $device->longitude = $longitude;
        $device->save();

        $this->activityLogService->logPaired($device, $user->id);

        return $device;
    }

    public function updateDeviceLocation(Device $device, float $latitude, float $longitude): Device
    {
        $device->latitude = $latitude;
        $device->longitude = $longitude;
        $device->save();

        $this->activityLogService->logLocationUpdated($device);

        return $device;
    }

    public function recordTelemetry(Device $device, array $payload): DeviceTelemetry
    {
        $receivedAt = now();

        // Validate recorded_at from device - reject known bad placeholders
        $rawRecordedAt = $payload['recorded_at'] ?? null;
        $recordedAt = $this->parseRecordedAt($rawRecordedAt, $receivedAt);

        // Calculate latency: how long from reading creation to backend receipt
        $latencyMs = null;
        if ($recordedAt instanceof Carbon) {
            $latencyMs = (int) abs($receivedAt->diffInMilliseconds($recordedAt));
            // Sanity cap: if latency is > 1 hour, the device clock is probably wrong
            if ($latencyMs > 3600_000) {
                $latencyMs = null;
            }
        }

        $telemetry = $device->telemetry()->create([
            'recorded_at' => $recordedAt,
            'received_at' => $receivedAt,
            'reading_timestamp_ms' => $payload['reading_timestamp_ms'] ?? null,
            'latency_ms' => $latencyMs,
            'temperature_celsius' => $payload['temperature_celsius'] ?? null,
            'ph' => $payload['ph'] ?? null,
            'turbidity_ntu' => $payload['turbidity_ntu'] ?? null,
            'tds_mg_l' => $payload['tds_mg_l'] ?? null,
            'water_level_cm' => $payload['water_level_cm'] ?? null,
            'raw_payload' => $payload,
        ]);

        $device->last_seen_at = $receivedAt;
        $device->save();

        $this->activityLogService->logTelemetryReceived($device, $payload);

        return $telemetry;
    }

    private function parseRecordedAt(?string $rawRecordedAt, Carbon $fallback): Carbon
    {
        if (empty($rawRecordedAt)) {
            return $fallback;
        }

        // Detect epoch / un-synced device clocks (1970 or any year before 2020)
        if (str_starts_with($rawRecordedAt, '1970-') || str_starts_with($rawRecordedAt, '1969-')) {
            return $fallback;
        }

        try {
            $parsed = Carbon::parse($rawRecordedAt);

            // Detect obviously wrong years (before 2020 = un-synced RTC)
            if ($parsed->year < 2020) {
                return $fallback;
            }

            // Sanity checks: must be within last 24h and not more than 1 minute in the future
            // (allow 1 min tolerance for minor clock skew between device and server)
            if ($parsed->greaterThan(now()->addMinute()) || $parsed->lessThan(now()->subDay())) {
                return $fallback;
            }

            return $parsed;
        } catch (\Exception $e) {
            return $fallback;
        }
    }
}
