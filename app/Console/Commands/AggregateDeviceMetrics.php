<?php

namespace App\Console\Commands;

use App\Models\Device;
use App\Services\MetricsAggregationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AggregateDeviceMetrics extends Command
{
    protected $signature = 'device:aggregate-metrics {--date=} {--backfill}';
    protected $description = 'Rollup device telemetry into daily and monthly aggregates';

    public function handle(MetricsAggregationService $service): int
    {
        if ($this->option('backfill')) {
            $this->info('Backfilling metrics...');
            $devices = Device::whereNotNull('paired_at')->get();
            foreach ($devices as $device) {
                $telemetryDates = $device->telemetry()
                    ->selectRaw('DATE(recorded_at) as date')
                    ->distinct()
                    ->pluck('date')
                    ->all();

                foreach ($telemetryDates as $date) {
                    $service->rollupDaily($device, $date);
                }
            }
            $this->info('Backfill complete.');
            return self::SUCCESS;
        }

        $date = $this->option('date') ?? Carbon::yesterday()->toDateString();
        $yearMonth = Carbon::parse($date)->format('Y-m');

        $devices = Device::whereNotNull('paired_at')->get();

        foreach ($devices as $device) {
            $service->rollupDaily($device, $date);
            $service->rollupMonthly($device, $yearMonth);
        }

        $this->info("Aggregated metrics for {$date} and {$yearMonth}.");
        return self::SUCCESS;
    }
}
