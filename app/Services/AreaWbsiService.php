<?php

namespace App\Services;

use App\Models\Device;
use App\Models\Report;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AreaWbsiService
{
    private const SHRINKAGE_KAPPA = 20.0;
    private const SMALL_SAMPLE_THRESHOLD = 20;

    public function __construct(private readonly WbsiService $wbsiService)
    {
    }

    public function areas(?Carbon $from = null, ?Carbon $to = null, ?array $bbox = null): array
    {
        $settings = $this->wbsiService->settings();
        $reports = $this->eligibleReports($from, $to, $bbox);
        $areas = $this->reportAreas($reports, $settings);
        $this->assignSensors($areas, $from, $to, $bbox, (float) $settings->wbsi_sensor_assignment_radius_m);
        $areas = array_merge($areas, $this->sensorOnlyAreas($areas, $from, $to, $bbox));

        return array_values(array_map(fn (array $area): array => $this->finalizeArea($area), $areas));
    }

    public function nationalSummary(array $areas): array
    {
        $weightedTotal = 0.0;
        $totalWeight = 0.0;
        $latest = null;
        $counts = [
            'combined' => 0,
            'report_only' => 0,
            'sensor_only' => 0,
        ];

        foreach ($areas as $area) {
            $score = $this->bestScore($area);
            if ($score === null) {
                continue;
            }

            $source = $area['source'] ?? 'report_only';
            $counts[$source] = ($counts[$source] ?? 0) + 1;

            $reportWeight = min((int) ($area['report_count'] ?? 0), 10);
            $sensorWeight = min(count($area['assigned_sensors'] ?? []), 5) * 3;
            $evidenceWeight = max(1, $reportWeight + $sensorWeight);
            $lastUpdated = $this->lastUpdatedAt($area);
            $recencyWeight = $this->recencyWeight($lastUpdated);

            $weight = $evidenceWeight * $recencyWeight;
            $weightedTotal += $score * $weight;
            $totalWeight += $weight;

            if ($lastUpdated && ($latest === null || $lastUpdated->greaterThan($latest))) {
                $latest = $lastUpdated;
            }
        }

        $national = $totalWeight > 0 ? round($weightedTotal / $totalWeight, 2) : null;

        return [
            'national_wbsi' => $national,
            'severity_label' => $national === null ? null : $this->wbsiService->severityLabel($national),
            'area_count' => count($areas),
            'combined_count' => $counts['combined'],
            'report_only_count' => $counts['report_only'],
            'sensor_only_count' => $counts['sensor_only'],
            'last_updated_at' => $latest?->toISOString(),
        ];
    }

    /**
     * Build a report-only WBSI distribution payload for chart rendering.
     *
     * Defaults:
     * - With no verified reports, uses a neutral WBSI of 50 with 0% consensus.
     * - Shrinkage uses kappa=20.0 (small samples are damped toward 0% for display).
     *
     * Practical behavior:
     * - Few reports (1-19) yield a noticeably smaller `wbsi_display_shrunk` than the modal severity.
     * - Many reports (20+) keep `wbsi_display_shrunk` close to the raw modal severity.
     */
    public function distributionForReports(iterable $reports): array
    {
        $reportArray = is_array($reports) ? $reports : iterator_to_array($reports);
        $verified = array_values(array_filter($reportArray, fn (Report $report): bool => (string) $report->status === 'verified'));
        $severities = array_map(fn (Report $report): float => $this->wbsiService->reportSeverity($report), $verified);
        $weights = array_map(fn (Report $report): float => $this->reportWeight($report), $verified);

        if ($severities === []) {
            $defaultWbsi = 50.0;
            return [
                'wbsi' => $defaultWbsi,
                'consensus' => 0.0,
                'n_reports' => 0,
                'bar_data' => [],
                'kde_data' => [],
                'config' => [
                    'peak_severity' => $defaultWbsi,
                    'consensus_range' => [max(0, $defaultWbsi - 10), min(100, $defaultWbsi + 10)],
                    'wbsi_display' => $defaultWbsi,
                    'wbsi_display_shrunk' => $defaultWbsi,
                    'shrinkage_factor' => 0.0,
                    'consensus_percentage' => 0,
                    'severity_bands' => ['low' => 0, 'medium' => 0, 'high' => 0, 'critical' => 0],
                    'n_reports' => 0,
                    'is_polymodal' => false,
                ],
                'outliers' => [],
            ];
        }

        $kde = $this->kernelDensity($severities, $weights);
        $peakIndex = array_keys($kde['y'], max($kde['y']))[0] ?? 0;
        $modalSeverity = round($kde['x'][$peakIndex] ?? 50.0, 2);
        $consensus = $this->consensus($severities, $weights, $modalSeverity);
        $histogram = $this->histogram($severities, $weights);
        $severityBands = $this->severityBands($severities, $weights);
        $nReports = count($verified);
        $shrinkageFactor = $nReports / ($nReports + self::SHRINKAGE_KAPPA);
        $wbsiDisplayShrunk = round($modalSeverity * $shrinkageFactor, 2);
        $polymodality = $this->detectPolymodality($kde['x'], $kde['y']);
        $maxKde = max($kde['y']) ?: 0.0;
        $maxBarHeight = max(array_column($histogram, 'count')) ?: 0.0;
        $kdeData = array_map(
            fn (float $x, float $y): array => [
                'severity' => round($x, 1),
                'density' => round($y, 6),
                'normalized' => round($maxKde > 0 ? ($y / $maxKde) * $maxBarHeight : 0.0, 2),
            ],
            $kde['x'],
            $kde['y']
        );

        return [
            'wbsi' => $modalSeverity,
            'consensus' => round($consensus, 4),
            'n_reports' => $nReports,
            'bar_data' => $histogram,
            'kde_data' => $kdeData,
            'config' => [
                'peak_severity' => $modalSeverity,
                'consensus_range' => [max(0, $modalSeverity - 10), min(100, $modalSeverity + 10)],
                'wbsi_display' => $modalSeverity,
                'wbsi_display_shrunk' => $wbsiDisplayShrunk,
                'shrinkage_factor' => round($shrinkageFactor, 4),
                'consensus_percentage' => round($consensus * 100, 1),
                'severity_bands' => $severityBands,
                'n_reports' => $nReports,
                'is_polymodal' => $polymodality['is_polymodal'],
            ],
            'outliers' => [],
        ];
    }

    private function eligibleReports(?Carbon $from, ?Carbon $to, ?array $bbox): Collection
    {
        return Report::query()
            ->with('user:id,firstName,lastName,email')
            ->where('status', 'verified')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->when($from, fn ($query) => $query->where('created_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('created_at', '<=', $to))
            ->when($bbox, fn ($query) => $this->applyBbox($query, $bbox))
            ->orderByDesc('created_at')
            ->get();
    }

    private function reportAreas(Collection $reports, object $settings): array
    {
        $areas = [];
        $remaining = collect();

        $reports->groupBy(fn (Report $report): string => $this->normalizeWaterBody($report->water_body_name))
            ->each(function (Collection $group, string $waterBody) use (&$areas, $settings, &$remaining): void {
                if ($waterBody === '') {
                    $remaining = $remaining->merge($group);
                    return;
                }

                foreach ($this->clusterReports($group, (float) $settings->wbsi_named_water_body_segment_radius_m) as $index => $cluster) {
                    $areas[] = $this->makeReportArea('water_body:' . $waterBody . ':' . $index, 'water_body', $cluster, Str::headline($waterBody));
                }
            });

        $ungrouped = collect();
        $remaining->groupBy('report_group_id')->each(function (Collection $group, string|int|null $groupId) use (&$areas, &$ungrouped): void {
            if ($groupId === '' || $groupId === null) {
                $ungrouped = $ungrouped->merge($group);
                return;
            }

            $areas[] = $this->makeReportArea('report_group:' . $groupId, 'report_group', $group, 'Report Group ' . $groupId);
        });

        foreach ($this->clusterReports($ungrouped, (float) $settings->wbsi_ungrouped_proximity_radius_m) as $index => $cluster) {
            $areas[] = $this->makeReportArea('proximity:' . $index, 'proximity', $cluster, null);
        }

        return $areas;
    }

    /**
     * Build a report-driven area record with both the report score and chart distribution.
     *
     * Defaults:
    * - `report_wbsi` is null if there are no verified reports.
    * - `severity_label` is derived from the display WBSI when available.
    * - `report_score` keeps the raw report score used for Master WBSI weighting.
     */
    private function makeReportArea(string $id, string $method, Collection $reports, ?string $displayName): array
    {
        $representative = $this->representativeReport($reports);
        $distribution = $this->distributionForReports($reports->all());
        $reportScore = $this->wbsiService->calculateReportScore($reports);
        $reportWbsi = $this->displayReportWbsi($distribution);

        return [
            'id' => $id,
            'grouping_method' => $method,
            'display_name' => $displayName ?: ($representative->address ?: 'Pollution Area'),
            'latitude' => (float) $representative->latitude,
            'longitude' => (float) $representative->longitude,
            'report_count' => $reports->count(),
            'reports' => $reports->values()->all(),
            'assigned_sensors' => [],
            'report_score' => $reportScore,
            'report_wbsi' => $reportWbsi,
            'sensor_score' => null,
            'area_wbsi' => null,
            'source' => 'report_only',
            'severity_label' => $reportWbsi === null ? null : $this->wbsiService->severityLabel($reportWbsi),
            'distribution' => $distribution,
        ];
    }

    private function assignSensors(array &$areas, ?Carbon $from, ?Carbon $to, ?array $bbox, float $radiusM): void
    {
        $devices = $this->sensorQuery($bbox)->get();
        $assignedDeviceIds = [];

        foreach ($devices as $device) {
            $latest = $this->latestTelemetry($device, $from, $to);
            if (!$latest) {
                continue;
            }

            $closestIndex = null;
            $closestDistanceM = null;

            foreach ($areas as $index => $area) {
                $distanceM = $this->wbsiService->distanceKm((float) $device->latitude, (float) $device->longitude, (float) $area['latitude'], (float) $area['longitude']) * 1000;
                if ($distanceM <= $radiusM && ($closestDistanceM === null || $distanceM < $closestDistanceM)) {
                    $closestIndex = $index;
                    $closestDistanceM = $distanceM;
                }
            }

            if ($closestIndex === null) {
                continue;
            }

            $sensor = $this->sensorPayload($device, $latest, $closestDistanceM);
            $areas[$closestIndex]['assigned_sensors'][] = $sensor;
            $areas[$closestIndex]['sensor_score'] = $this->averageSensorScore($areas[$closestIndex]['assigned_sensors']);
            $areas[$closestIndex]['area_wbsi'] = $this->wbsiService->calculateMasterScore($areas[$closestIndex]['sensor_score'], $areas[$closestIndex]['report_score'] ?? null);
            $areas[$closestIndex]['source'] = 'combined';
            $areas[$closestIndex]['severity_label'] = $areas[$closestIndex]['area_wbsi'] === null ? null : $this->wbsiService->severityLabel($areas[$closestIndex]['area_wbsi']);
            $assignedDeviceIds[$device->id] = true;
        }
    }

    private function sensorOnlyAreas(array $areas, ?Carbon $from, ?Carbon $to, ?array $bbox): array
    {
        $assignedIds = collect($areas)
            ->flatMap(fn (array $area): array => array_column($area['assigned_sensors'] ?? [], 'id'))
            ->flip();

        return $this->sensorQuery($bbox)
            ->get()
            ->reject(fn (Device $device): bool => $assignedIds->has($device->id))
            ->map(function (Device $device) use ($from, $to): ?array {
                $latest = $this->latestTelemetry($device, $from, $to);
                if (!$latest) {
                    return null;
                }

                $sensor = $this->sensorPayload($device, $latest, null);
                $score = $sensor['scores']['sensor_score'];

                return [
                    'id' => 'sensor:' . $device->id,
                    'grouping_method' => 'sensor',
                    'display_name' => $device->name ?: ($device->station_id ?: 'Sensor Station'),
                    'latitude' => (float) $device->latitude,
                    'longitude' => (float) $device->longitude,
                    'report_count' => 0,
                    'reports' => [],
                    'assigned_sensors' => [$sensor],
                    'report_score' => null,
                    'report_wbsi' => null,
                    'sensor_score' => $score,
                    'area_wbsi' => null,
                    'source' => 'sensor_only',
                    'severity_label' => $score === null ? null : $this->wbsiService->severityLabel($score),
                    'distribution' => $this->distributionForReports([]),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    private function displayReportWbsi(array $distribution): ?float
    {
        $config = $distribution['config'] ?? [];
        $nReports = (int) ($config['n_reports'] ?? 0);
        $raw = $config['wbsi_display'] ?? null;
        $shrunk = $config['wbsi_display_shrunk'] ?? null;

        if ($raw === null && $shrunk === null) {
            return null;
        }

        if ($nReports > 0 && $nReports < self::SMALL_SAMPLE_THRESHOLD && $shrunk !== null) {
            return (float) $shrunk;
        }

        return $raw !== null ? (float) $raw : (float) $shrunk;
    }

    private function finalizeArea(array $area): array
    {
        $area['report_score'] = $area['report_score'] ?? null;
        $area['score'] = $this->bestScore($area);

        return $area;
    }

    private function bestScore(array $area): ?float
    {
        return $area['area_wbsi'] ?? $area['report_wbsi'] ?? $area['sensor_score'] ?? null;
    }

    private function sensorQuery(?array $bbox)
    {
        return Device::query()
            ->with('latestTelemetry')
            ->whereNotNull('paired_at')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->when($bbox, fn ($query) => $this->applyBbox($query, $bbox));
    }

    private function latestTelemetry(Device $device, ?Carbon $from, ?Carbon $to)
    {
        if (!$from && !$to) {
            return $device->latestTelemetry;
        }

        return $device->telemetry()
            ->when($from, fn ($query) => $query->where('recorded_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('recorded_at', '<=', $to))
            ->orderByDesc('recorded_at')
            ->first();
    }

    private function sensorPayload(Device $device, $latest, ?float $distanceM): array
    {
        return [
            'id' => $device->id,
            'station_id' => $device->station_id,
            'name' => $device->name,
            'latitude' => (float) $device->latitude,
            'longitude' => (float) $device->longitude,
            'environment_type' => $device->environment_type ?? 'freshwater',
            'last_seen_at' => $device->last_seen_at,
            'latest_telemetry' => $latest,
            'distance_m' => $distanceM === null ? null : round($distanceM, 2),
            'scores' => $this->wbsiService->scoreTelemetryForDevice($device, $latest, null),
        ];
    }

    private function clusterReports(Collection $reports, float $radiusM): array
    {
        $clusters = [];

        foreach ($reports->values() as $report) {
            $closestIndex = null;
            $closestDistanceM = null;

            foreach ($clusters as $index => $cluster) {
                $representative = $this->representativeReport($cluster);
                $distanceM = $this->wbsiService->distanceKm((float) $report->latitude, (float) $report->longitude, (float) $representative->latitude, (float) $representative->longitude) * 1000;
                if ($distanceM <= $radiusM && ($closestDistanceM === null || $distanceM < $closestDistanceM)) {
                    $closestIndex = $index;
                    $closestDistanceM = $distanceM;
                }
            }

            if ($closestIndex === null) {
                $clusters[] = collect([$report]);
            } else {
                $clusters[$closestIndex]->push($report);
            }
        }

        return $clusters;
    }

    private function representativeReport(Collection $reports): Report
    {
        if ($reports->count() === 1) {
            return $reports->first();
        }

        return $reports
            ->sortBy(function (Report $candidate) use ($reports): string {
                $distanceSum = $reports->sum(fn (Report $report): float => $this->wbsiService->distanceKm((float) $candidate->latitude, (float) $candidate->longitude, (float) $report->latitude, (float) $report->longitude));

                return sprintf('%020.8f:%020d', $distanceSum, PHP_INT_MAX - Carbon::parse($candidate->created_at)->timestamp);
            })
            ->first();
    }

    private function normalizeWaterBody(?string $name): string
    {
        return trim((string) Str::of($name ?? '')->lower()->squish());
    }

    private function averageSensorScore(array $sensors): ?float
    {
        $scores = array_values(array_filter(array_map(fn (array $sensor) => $sensor['scores']['sensor_score'] ?? null, $sensors), fn ($score) => $score !== null));

        return $scores === [] ? null : round(array_sum($scores) / count($scores), 2);
    }

    private function reportWeight(Report $report): float
    {
        $confidence = max(0.0, min(1.0, ((float) ($report->ai_confidence ?? 50)) / 100.0));
        $days = max(0, Carbon::parse($report->created_at)->diffInDays(now()));

        return max(0.01, $confidence * exp(-0.01 * $days));
    }

    private function kernelDensity(array $severities, array $weights): array
    {
        $x = [];
        $y = [];
        $totalWeight = array_sum($weights);
        $bandwidth = 8.0;

        $step = 0.5;
        $points = (int) round(100.0 / $step);

        for ($i = 0; $i <= $points; $i++) {
            $severityPoint = $i * $step;
            $density = 0.0;
            foreach ($severities as $index => $severity) {
                $arg = ($severityPoint - $severity) / $bandwidth;
                $density += (($weights[$index] ?? 1.0) / max($totalWeight, 0.0001)) * (exp(-0.5 * $arg * $arg) / ($bandwidth * sqrt(2 * M_PI)));
            }
            $x[] = $severityPoint;
            $y[] = $density;
        }

        return ['x' => $x, 'y' => $y];
    }

    private function consensus(array $severities, array $weights, float $modalSeverity): float
    {
        $totalWeight = array_sum($weights);
        if ($totalWeight <= 0) {
            return 0.0;
        }

        $consensusWeight = 0.0;
        foreach ($severities as $index => $severity) {
            if (abs($severity - $modalSeverity) <= 10) {
                $consensusWeight += $weights[$index] ?? 1.0;
            }
        }

        return $consensusWeight / $totalWeight;
    }

    private function detectPolymodality(array $xPoints, array $densityValues, float $thresholdRatio = 0.8, float $minSeparation = 15.0): array
    {
        if (count($densityValues) < 3) {
            return ['is_polymodal' => false, 'peaks' => []];
        }

        $peaks = [];
        for ($i = 1; $i < count($densityValues) - 1; $i++) {
            if ($densityValues[$i] > $densityValues[$i - 1] && $densityValues[$i] > $densityValues[$i + 1]) {
                $peaks[] = [$xPoints[$i], $densityValues[$i]];
            }
        }

        if (count($peaks) < 2) {
            return ['is_polymodal' => false, 'peaks' => $peaks];
        }

        usort($peaks, fn (array $a, array $b) => $b[1] <=> $a[1]);

        $highestPeak = $peaks[0];
        $secondPeak = $peaks[1];
        $ratio = $highestPeak[1] > 0 ? ($secondPeak[1] / $highestPeak[1]) : 0.0;
        $separation = abs($secondPeak[0] - $highestPeak[0]);

        return [
            'is_polymodal' => $ratio > $thresholdRatio && $separation > $minSeparation,
            'peaks' => $peaks,
            'ratio' => $ratio,
            'separation' => $separation,
        ];
    }

    private function histogram(array $severities, array $weights): array
    {
        $bins = [];
        for ($i = 0; $i < 20; $i++) {
            $center = ($i + 0.5) * 5;
            $bins[$i] = ['severity' => $center, 'count' => 0.0, 'band' => $this->bandName($center)];
        }

        foreach ($severities as $index => $severity) {
            $bin = min(19, (int) floor($severity / 5));
            $bins[$bin]['count'] += $weights[$index] ?? 1.0;
        }

        return array_values(array_map(fn (array $bin): array => [
            ...$bin,
            'count' => round($bin['count'], 2),
        ], $bins));
    }

    private function severityBands(array $severities, array $weights): array
    {
        $bands = ['low' => 0.0, 'medium' => 0.0, 'high' => 0.0, 'critical' => 0.0];
        $totalWeight = array_sum($weights);

        foreach ($severities as $index => $severity) {
            $weight = $weights[$index] ?? 1.0;
            $bands[strtolower($this->bandName($severity))] += $weight;
        }

        if ($totalWeight <= 0) {
            return $bands;
        }

        foreach ($bands as $key => $value) {
            $bands[$key] = round(($value / $totalWeight) * 100, 1);
        }

        return $bands;
    }

    private function bandName(float $severity): string
    {
        if ($severity < 25) {
            return 'low';
        }
        if ($severity < 50) {
            return 'medium';
        }
        if ($severity < 75) {
            return 'high';
        }

        return 'critical';
    }

    private function applyBbox($query, array $bbox): void
    {
        [$south, $west, $north, $east] = $bbox;

        $query->whereBetween('latitude', [$south, $north])
            ->whereBetween('longitude', [$west, $east]);
    }

    private function lastUpdatedAt(array $area): ?Carbon
    {
        $dates = collect($area['reports'] ?? [])
            ->map(fn (Report $report) => $report->created_at ? Carbon::parse($report->created_at) : null)
            ->filter();

        foreach ($area['assigned_sensors'] ?? [] as $sensor) {
            if (!empty($sensor['latest_telemetry']?->recorded_at)) {
                $dates->push(Carbon::parse($sensor['latest_telemetry']->recorded_at));
            }
        }

        return $dates->sortDesc()->first();
    }

    private function recencyWeight(?Carbon $lastUpdated): float
    {
        if (!$lastUpdated) {
            return 0.25;
        }

        return max(0.10, exp(-0.01 * max(0, $lastUpdated->diffInDays(now()))));
    }
}
