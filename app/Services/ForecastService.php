<?php

namespace App\Services;

use App\Models\Report;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ForecastService
{
    public function forecast(array $options): array
    {
        $metric = (string) ($options['metric'] ?? 'report_volume');
        $region = (string) ($options['region'] ?? 'all');
        $horizon = (int) ($options['horizon'] ?? 30);
        $cleanupIntensity = max(0.1, (float) ($options['cleanup_intensity'] ?? 1.0));
        $interventionDelayDays = max(0, (int) ($options['intervention_delay_days'] ?? 0));

        $historical = $this->buildTimeSeries($metric, $region, 180);
        $features = $this->buildFeatureDataset($historical);

        $evaluation = $this->evaluateBaselines($historical);
        $bestModel = $evaluation['best_model'];

        $forecastPoints = $this->projectSeries(
            series: $historical,
            horizonDays: $horizon,
            bestModel: $bestModel,
            cleanupIntensity: $cleanupIntensity,
            interventionDelayDays: $interventionDelayDays
        );

        $drift = $this->computeDrift($historical);

        $response = [
            'metric' => $metric,
            'region' => $region,
            'horizon_days' => $horizon,
            'kpis' => $this->kpis(),
            'historical' => $historical,
            'features' => [
                'rows' => count($features),
                'columns' => ['date', 'value', 'lag_1', 'lag_7', 'rolling_mean_7', 'day_of_week'],
                'sample' => array_slice($features, -5),
            ],
            'evaluation' => $evaluation,
            'drift' => $drift,
            'forecast' => $forecastPoints,
            'model' => [
                'version' => config('services.waterbase_forecast.model_version', 'forecast-v1'),
                'rollback_version' => config('services.waterbase_forecast.rollback_version', 'forecast-v0'),
                'retrain_schedule' => config('services.waterbase_forecast.retrain_schedule', 'weekly'),
                'generated_at' => now()->toIso8601String(),
            ],
            'scenario' => [
                'cleanup_intensity' => $cleanupIntensity,
                'intervention_delay_days' => $interventionDelayDays,
            ],
        ];

        Log::info('forecast.generated', [
            'metric' => $metric,
            'region' => $region,
            'horizon_days' => $horizon,
            'model_version' => $response['model']['version'],
            'best_model' => $bestModel,
            'drift' => $drift,
        ]);

        return $response;
    }

    public function kpis(): array
    {
        return [
            'report_volume',
            'severity_mix',
            'hotspot_recurrence',
            'cleanup_completion_lead_time',
        ];
    }

    private function buildTimeSeries(string $metric, string $region, int $lookbackDays): array
    {
        $start = Carbon::now()->subDays($lookbackDays)->startOfDay();
        $end = Carbon::now()->endOfDay();

        $query = Report::query()->whereBetween('created_at', [$start, $end]);

        if ($region !== 'all') {
            $query->where('address', 'like', '%' . $region . '%');
        }

        $reports = $query->get();

        $seriesMap = [];
        $cursor = $start->copy();
        while ($cursor <= $end) {
            $seriesMap[$cursor->toDateString()] = 0.0;
            $cursor->addDay();
        }

        foreach ($reports as $report) {
            $key = Carbon::parse($report->created_at)->toDateString();
            if (!array_key_exists($key, $seriesMap)) {
                continue;
            }

            switch ($metric) {
                case 'severity_mix':
                    $seriesMap[$key] += $this->severityToScore((string) $report->severityByUser);
                    break;
                case 'cleanup_completion_lead_time':
                    if ($report->verified_at) {
                        $leadDays = Carbon::parse($report->created_at)->diffInDays(Carbon::parse($report->verified_at));
                        $seriesMap[$key] += $leadDays;
                    }
                    break;
                case 'hotspot_recurrence':
                    $hotspotKey = strtolower(trim((string) $report->address));
                    $seriesMap[$key] += $hotspotKey !== '' ? 1.0 : 0.0;
                    break;
                case 'report_volume':
                default:
                    $seriesMap[$key] += 1.0;
                    break;
            }
        }

        $series = [];
        foreach ($seriesMap as $date => $value) {
            $series[] = ['date' => $date, 'value' => round($value, 4)];
        }

        return $series;
    }

    private function buildFeatureDataset(array $series): array
    {
        $values = array_map(fn ($row) => (float) $row['value'], $series);
        $rows = [];

        foreach ($series as $index => $row) {
            $lag1 = $index >= 1 ? $values[$index - 1] : 0.0;
            $lag7 = $index >= 7 ? $values[$index - 7] : 0.0;

            $window = array_slice($values, max(0, $index - 6), 7);
            $rolling = count($window) > 0 ? array_sum($window) / count($window) : 0.0;

            $rows[] = [
                'date' => $row['date'],
                'value' => $values[$index],
                'lag_1' => round($lag1, 4),
                'lag_7' => round($lag7, 4),
                'rolling_mean_7' => round($rolling, 4),
                'day_of_week' => (int) Carbon::parse($row['date'])->dayOfWeek,
            ];
        }

        return $rows;
    }

    private function evaluateBaselines(array $series): array
    {
        $values = array_values(array_map(fn ($row) => (float) $row['value'], $series));
        $n = count($values);

        if ($n < 10) {
            return [
                'best_model' => 'naive_last_observation',
                'models' => [
                    ['name' => 'naive_last_observation', 'mae' => 0.0, 'rmse' => 0.0, 'directional_accuracy' => 0.0],
                ],
            ];
        }

        $split = max(7, (int) floor($n * 0.8));
        $train = array_slice($values, 0, $split);
        $test = array_slice($values, $split);

        $predictions = [
            'naive_last_observation' => $this->predictNaive($train, count($test)),
            'rolling_mean_7' => $this->predictRollingMean($train, count($test), 7),
            'linear_trend' => $this->predictLinearTrend($train, count($test)),
        ];

        $metrics = [];
        foreach ($predictions as $name => $pred) {
            $metrics[] = array_merge(['name' => $name], $this->errorMetrics($test, $pred));
        }

        usort($metrics, fn ($a, $b) => $a['mae'] <=> $b['mae']);

        return [
            'best_model' => $metrics[0]['name'],
            'models' => $metrics,
        ];
    }

    private function projectSeries(array $series, int $horizonDays, string $bestModel, float $cleanupIntensity, int $interventionDelayDays): array
    {
        $values = array_values(array_map(fn ($row) => (float) $row['value'], $series));
        $historySize = count($values);

        $basePred = match ($bestModel) {
            'rolling_mean_7' => $this->predictRollingMean($values, $horizonDays, 7),
            'linear_trend' => $this->predictLinearTrend($values, $horizonDays),
            default => $this->predictNaive($values, $horizonDays),
        };

        $residualStd = $this->residualStd($values);
        $delayMultiplier = 1 + min(0.3, $interventionDelayDays * 0.01);
        $cleanupMultiplier = 1 / $cleanupIntensity;

        $result = [];
        $startDate = Carbon::today()->addDay();
        for ($i = 0; $i < $horizonDays; $i++) {
            $adjusted = max(0.0, $basePred[$i] * $delayMultiplier * $cleanupMultiplier);
            $delta = 1.96 * $residualStd;

            $result[] = [
                'date' => $startDate->copy()->addDays($i)->toDateString(),
                'predicted' => round($adjusted, 4),
                'lower' => round(max(0.0, $adjusted - $delta), 4),
                'upper' => round(max(0.0, $adjusted + $delta), 4),
                'confidence' => 0.95,
            ];
        }

        Log::info('forecast.projected', [
            'history_size' => $historySize,
            'horizon_days' => $horizonDays,
            'model' => $bestModel,
            'cleanup_intensity' => $cleanupIntensity,
            'intervention_delay_days' => $interventionDelayDays,
        ]);

        return $result;
    }

    private function computeDrift(array $series): array
    {
        $values = array_values(array_map(fn ($row) => (float) $row['value'], $series));
        if (count($values) < 30) {
            return [
                'status' => 'insufficient_data',
                'mean_shift' => 0.0,
                'variance_shift' => 0.0,
            ];
        }

        $recent = array_slice($values, -30);
        $baseline = array_slice($values, max(0, count($values) - 120), 90);

        $recentMean = $this->mean($recent);
        $baseMean = $this->mean($baseline);
        $recentVar = $this->variance($recent, $recentMean);
        $baseVar = $this->variance($baseline, $baseMean);

        $meanShift = $baseMean == 0.0 ? ($recentMean > 0 ? 1.0 : 0.0) : abs($recentMean - $baseMean) / max(0.0001, abs($baseMean));
        $varianceShift = $baseVar == 0.0 ? ($recentVar > 0 ? 1.0 : 0.0) : abs($recentVar - $baseVar) / max(0.0001, abs($baseVar));

        $status = ($meanShift > 0.35 || $varianceShift > 0.50) ? 'drift_detected' : 'stable';

        return [
            'status' => $status,
            'mean_shift' => round($meanShift, 4),
            'variance_shift' => round($varianceShift, 4),
        ];
    }

    private function errorMetrics(array $actual, array $predicted): array
    {
        $n = max(1, min(count($actual), count($predicted)));
        $maeAcc = 0.0;
        $mseAcc = 0.0;
        $dirHits = 0;

        for ($i = 0; $i < $n; $i++) {
            $err = $actual[$i] - $predicted[$i];
            $maeAcc += abs($err);
            $mseAcc += $err * $err;

            if ($i > 0) {
                $actualDir = $actual[$i] - $actual[$i - 1];
                $predDir = $predicted[$i] - $predicted[$i - 1];
                if (($actualDir >= 0 && $predDir >= 0) || ($actualDir < 0 && $predDir < 0)) {
                    $dirHits++;
                }
            }
        }

        return [
            'mae' => round($maeAcc / $n, 4),
            'rmse' => round(sqrt($mseAcc / $n), 4),
            'directional_accuracy' => $n > 1 ? round(($dirHits / ($n - 1)) * 100, 2) : 0.0,
        ];
    }

    private function predictNaive(array $series, int $steps): array
    {
        $last = count($series) > 0 ? (float) $series[count($series) - 1] : 0.0;
        return array_fill(0, $steps, $last);
    }

    private function predictRollingMean(array $series, int $steps, int $window): array
    {
        $seed = $series;
        $pred = [];

        for ($i = 0; $i < $steps; $i++) {
            $slice = array_slice($seed, max(0, count($seed) - $window), $window);
            $value = count($slice) > 0 ? array_sum($slice) / count($slice) : 0.0;
            $pred[] = $value;
            $seed[] = $value;
        }

        return $pred;
    }

    private function predictLinearTrend(array $series, int $steps): array
    {
        $n = count($series);
        if ($n < 2) {
            return $this->predictNaive($series, $steps);
        }

        $sumX = 0.0;
        $sumY = 0.0;
        $sumXX = 0.0;
        $sumXY = 0.0;

        for ($i = 0; $i < $n; $i++) {
            $x = (float) $i;
            $y = (float) $series[$i];
            $sumX += $x;
            $sumY += $y;
            $sumXX += $x * $x;
            $sumXY += $x * $y;
        }

        $den = ($n * $sumXX) - ($sumX * $sumX);
        $slope = $den == 0.0 ? 0.0 : (($n * $sumXY) - ($sumX * $sumY)) / $den;
        $intercept = ($sumY - ($slope * $sumX)) / $n;

        $pred = [];
        for ($i = 0; $i < $steps; $i++) {
            $x = $n + $i;
            $pred[] = max(0.0, ($slope * $x) + $intercept);
        }

        return $pred;
    }

    private function residualStd(array $series): float
    {
        if (count($series) < 8) {
            return 1.0;
        }

        $actual = array_slice($series, 1);
        $pred = array_slice($series, 0, count($series) - 1);

        $sq = 0.0;
        $n = min(count($actual), count($pred));

        for ($i = 0; $i < $n; $i++) {
            $e = $actual[$i] - $pred[$i];
            $sq += $e * $e;
        }

        return sqrt($sq / max(1, $n));
    }

    private function severityToScore(string $severity): float
    {
        return match (strtolower($severity)) {
            'low' => 25.0,
            'medium' => 50.0,
            'high' => 75.0,
            'critical' => 100.0,
            default => 50.0,
        };
    }

    private function mean(array $values): float
    {
        if (count($values) === 0) {
            return 0.0;
        }

        return array_sum($values) / count($values);
    }

    private function variance(array $values, float $mean): float
    {
        if (count($values) < 2) {
            return 0.0;
        }

        $sum = 0.0;
        foreach ($values as $value) {
            $d = $value - $mean;
            $sum += ($d * $d);
        }

        return $sum / (count($values) - 1);
    }
}
