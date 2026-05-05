<?php

namespace App\Services;

use App\Models\Device;
use App\Models\MetricsDaily;
use App\Models\MetricsMonthly;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MetricsAggregationService
{
    public function rollupDaily(Device $device, string $date): void
    {
        $start = Carbon::parse($date)->startOfDay();
        $end = Carbon::parse($date)->endOfDay();

        $aggregates = $device->telemetry()
            ->whereBetween('recorded_at', [$start, $end])
            ->select(
                DB::raw('AVG(ph) as avg_ph'),
                DB::raw('MIN(ph) as min_ph'),
                DB::raw('MAX(ph) as max_ph'),
                DB::raw('AVG(tds_mg_l) as avg_tds'),
                DB::raw('MIN(tds_mg_l) as min_tds'),
                DB::raw('MAX(tds_mg_l) as max_tds'),
                DB::raw('AVG(turbidity_ntu) as avg_turbidity'),
                DB::raw('MIN(turbidity_ntu) as min_turbidity'),
                DB::raw('MAX(turbidity_ntu) as max_turbidity'),
                DB::raw('AVG(temperature_celsius) as avg_temp'),
                DB::raw('COUNT(*) as reading_count')
            )
            ->first();

        if (!$aggregates || $aggregates->reading_count == 0) {
            return;
        }

        MetricsDaily::updateOrCreate(
            [
                'device_id' => $device->id,
                'date' => $date,
            ],
            [
                'avg_ph' => $aggregates->avg_ph ? round($aggregates->avg_ph, 2) : null,
                'min_ph' => $aggregates->min_ph ? round($aggregates->min_ph, 2) : null,
                'max_ph' => $aggregates->max_ph ? round($aggregates->max_ph, 2) : null,
                'avg_tds_mg_l' => $aggregates->avg_tds ? round($aggregates->avg_tds, 2) : null,
                'min_tds_mg_l' => $aggregates->min_tds ? round($aggregates->min_tds, 2) : null,
                'max_tds_mg_l' => $aggregates->max_tds ? round($aggregates->max_tds, 2) : null,
                'avg_turbidity_ntu' => $aggregates->avg_turbidity ? round($aggregates->avg_turbidity, 2) : null,
                'min_turbidity_ntu' => $aggregates->min_turbidity ? round($aggregates->min_turbidity, 2) : null,
                'max_turbidity_ntu' => $aggregates->max_turbidity ? round($aggregates->max_turbidity, 2) : null,
                'avg_temp_celsius' => $aggregates->avg_temp ? round($aggregates->avg_temp, 2) : null,
                'reading_count' => (int) $aggregates->reading_count,
            ]
        );
    }

    public function rollupMonthly(Device $device, string $yearMonth): void
    {
        $start = Carbon::createFromFormat('Y-m', $yearMonth)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $yearMonth)->endOfMonth();

        $aggregates = MetricsDaily::where('device_id', $device->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->select(
                DB::raw('AVG(avg_ph) as avg_ph'),
                DB::raw('MIN(min_ph) as min_ph'),
                DB::raw('MAX(max_ph) as max_ph'),
                DB::raw('AVG(avg_tds_mg_l) as avg_tds'),
                DB::raw('MIN(min_tds_mg_l) as min_tds'),
                DB::raw('MAX(max_tds_mg_l) as max_tds'),
                DB::raw('AVG(avg_turbidity_ntu) as avg_turbidity'),
                DB::raw('MIN(min_turbidity_ntu) as min_turbidity'),
                DB::raw('MAX(max_turbidity_ntu) as max_turbidity'),
                DB::raw('AVG(avg_temp_celsius) as avg_temp'),
                DB::raw('SUM(reading_count) as reading_count')
            )
            ->first();

        if (!$aggregates || $aggregates->reading_count == 0) {
            return;
        }

        MetricsMonthly::updateOrCreate(
            [
                'device_id' => $device->id,
                'year_month' => $yearMonth,
            ],
            [
                'avg_ph' => $aggregates->avg_ph ? round($aggregates->avg_ph, 2) : null,
                'min_ph' => $aggregates->min_ph ? round($aggregates->min_ph, 2) : null,
                'max_ph' => $aggregates->max_ph ? round($aggregates->max_ph, 2) : null,
                'avg_tds_mg_l' => $aggregates->avg_tds ? round($aggregates->avg_tds, 2) : null,
                'min_tds_mg_l' => $aggregates->min_tds ? round($aggregates->min_tds, 2) : null,
                'max_tds_mg_l' => $aggregates->max_tds ? round($aggregates->max_tds, 2) : null,
                'avg_turbidity_ntu' => $aggregates->avg_turbidity ? round($aggregates->avg_turbidity, 2) : null,
                'min_turbidity_ntu' => $aggregates->min_turbidity ? round($aggregates->min_turbidity, 2) : null,
                'max_turbidity_ntu' => $aggregates->max_turbidity ? round($aggregates->max_turbidity, 2) : null,
                'avg_temp_celsius' => $aggregates->avg_temp ? round($aggregates->avg_temp, 2) : null,
                'reading_count' => (int) $aggregates->reading_count,
            ]
        );
    }

    public function backfill(array $dateRange): void
    {
        foreach ($dateRange as $date) {
            $devices = Device::whereNotNull('paired_at')->get();
            foreach ($devices as $device) {
                $this->rollupDaily($device, $date);
            }
        }
    }
}
