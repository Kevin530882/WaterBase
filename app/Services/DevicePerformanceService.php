<?php

namespace App\Services;

use App\Models\Device;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * DevicePerformanceService
 * 
 * Calculates performance metrics for IoT devices for thesis reporting.
 * Tracks:
 * - Latency (time from sensor read to server receipt)
 * - Delivery rates
 * - Uptime and reliability
 * - Trends and patterns
 */
class DevicePerformanceService
{
    /**
     * Get performance metrics for a single device
     */
    public function getDeviceMetrics(Device $device, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $query = $device->telemetry()
            ->whereNotNull('latency_ms')
            ->orderByDesc('recorded_at');

        if ($from) {
            $query->where('recorded_at', '>=', $from);
        }
        if ($to) {
            $query->where('recorded_at', '<=', $to);
        }

        $telemetries = $query->get();

        if ($telemetries->isEmpty()) {
            return [
                'device_id' => $device->id,
                'station_id' => $device->station_id,
                'message_count' => 0,
                'average_latency_ms' => null,
                'min_latency_ms' => null,
                'max_latency_ms' => null,
                'p50_latency_ms' => null,
                'p95_latency_ms' => null,
                'p99_latency_ms' => null,
                'period' => [
                    'from' => $from?->toIso8601String(),
                    'to' => $to?->toIso8601String(),
                ],
            ];
        }

        $latencies = $telemetries->pluck('latency_ms')->sort()->values();

        return [
            'device_id' => $device->id,
            'station_id' => $device->station_id,
            'message_count' => $telemetries->count(),
            'average_latency_ms' => round($latencies->avg(), 2),
            'min_latency_ms' => $latencies->min(),
            'max_latency_ms' => $latencies->max(),
            'p50_latency_ms' => $this->percentile($latencies, 50),
            'p95_latency_ms' => $this->percentile($latencies, 95),
            'p99_latency_ms' => $this->percentile($latencies, 99),
            'std_dev_ms' => round($this->standardDeviation($latencies->toArray()), 2),
            'period' => [
                'from' => $from?->toIso8601String(),
                'to' => $to?->toIso8601String(),
            ],
        ];
    }

    /**
     * Get hourly latency trends for a device
     */
    public function getHourlyTrends(Device $device, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $from = $from ?? now()->subDays(7);
        $to = $to ?? now();

        $telemetries = $device->telemetry()
            ->whereNotNull('latency_ms')
            ->whereBetween('recorded_at', [$from, $to])
            ->orderBy('recorded_at')
            ->get()
            ->groupBy(fn($t) => $t->recorded_at->format('Y-m-d H:00:00'));

        $trends = [];
        foreach ($telemetries as $hour => $readings) {
            $latencies = $readings->pluck('latency_ms');
            $trends[] = [
                'hour' => $hour,
                'message_count' => $latencies->count(),
                'average_latency_ms' => round($latencies->avg(), 2),
                'min_latency_ms' => $latencies->min(),
                'max_latency_ms' => $latencies->max(),
            ];
        }

        return $trends;
    }

    /**
     * Get delivery success rate for a device
     */
    public function getDeliveryRate(Device $device, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $from = $from ?? now()->subDays(7);
        $to = $to ?? now();

        // Expected telemetry messages (every 60 seconds = 1440 per day)
        $expectedInterval = 60; // seconds
        $expectedPerDay = (24 * 60 * 60) / $expectedInterval;
        
        $days = $from->diffInDays($to) + 1;
        $expectedTotal = ceil($expectedPerDay * $days);

        // Actual messages delivered
        $actual = $device->telemetry()
            ->whereBetween('recorded_at', [$from, $to])
            ->count();

        $deliveryRate = $expectedTotal > 0 ? ($actual / $expectedTotal) * 100 : 0;

        return [
            'period' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
                'days' => $days,
            ],
            'expected_messages' => $expectedTotal,
            'actual_messages' => $actual,
            'delivery_rate_percent' => round($deliveryRate, 2),
            'missing_messages' => max(0, $expectedTotal - $actual),
        ];
    }

    /**
     * Get complete performance report for thesis documentation
     */
    public function generatePerformanceReport(Device $device, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $from = $from ?? now()->subDays(30);
        $to = $to ?? now();

        return [
            'device' => [
                'id' => $device->id,
                'mac_address' => $device->mac_address,
                'station_id' => $device->station_id,
                'status' => $device->status,
                'paired_at' => $device->paired_at?->toIso8601String(),
            ],
            'period' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
                'duration_days' => $from->diffInDays($to) + 1,
            ],
            'latency_metrics' => $this->getDeviceMetrics($device, $from, $to),
            'delivery_metrics' => $this->getDeliveryRate($device, $from, $to),
            'hourly_trends' => $this->getHourlyTrends($device, $from, $to),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Calculate percentile from sorted array
     */
    private function percentile(Collection $data, float $percentile): ?int
    {
        $count = $data->count();
        if ($count === 0) {
            return null;
        }

        $index = ($percentile / 100) * ($count - 1);
        $lower = floor($index);
        $upper = ceil($index);

        if ($lower === $upper) {
            return (int)$data[$lower];
        }

        $weight = $index - $lower;
        return (int)(
            $data[$lower] * (1 - $weight) +
            $data[$upper] * $weight
        );
    }

    /**
     * Calculate standard deviation
     */
    private function standardDeviation(array $values): float
    {
        if (empty($values)) {
            return 0;
        }

        $mean = array_sum($values) / count($values);
        $squaredDifferences = array_map(
            fn($value) => pow($value - $mean, 2),
            $values
        );

        return sqrt(array_sum($squaredDifferences) / count($squaredDifferences));
    }
}
