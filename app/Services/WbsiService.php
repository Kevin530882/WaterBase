<?php

namespace App\Services;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\Report;
use App\Models\SystemSetting;
use Illuminate\Support\Carbon;

class WbsiService
{
    private const BASELINES = [
        'freshwater' => [
            'ph_min' => 6.5,
            'ph_max' => 8.5,
            'turbidity_ntu' => 5.0,
            'tds_mg_l' => 500.0,
            // Assumption for Philippine freshwater monitoring until a project-specific standard is configured.
            'temperature_min_celsius' => 24.0,
            'temperature_max_celsius' => 32.0,
        ],
        'marine' => [
            'ph_min' => 7.5,
            'ph_max' => 8.5,
            'turbidity_ntu' => 5.0,
            'tds_mg_l' => 35000.0,
            'temperature_min_celsius' => 24.0,
            'temperature_max_celsius' => 32.0,
        ],
    ];

    public function calculateSensorScore(DeviceTelemetry $telemetry, string $environmentType = 'freshwater'): array
    {
        $baseline = $this->baseline($environmentType);
        $weights = $this->weights($baseline);

        $components = [
            'turbidity' => $telemetry->turbidity_ntu === null ? null : $this->thresholdSeverity((float) $telemetry->turbidity_ntu, $baseline['turbidity_ntu']),
            'ph' => $telemetry->ph === null ? null : $this->rangeSeverity((float) $telemetry->ph, $baseline['ph_min'], $baseline['ph_max'], 1.5),
            'tds' => $telemetry->tds_mg_l === null ? null : $this->thresholdSeverity((float) $telemetry->tds_mg_l, $baseline['tds_mg_l']),
            'temperature' => $telemetry->temperature_celsius === null ? null : $this->rangeSeverity((float) $telemetry->temperature_celsius, $baseline['temperature_min_celsius'], $baseline['temperature_max_celsius'], 8.0),
        ];

        $availableWeight = 0.0;
        foreach ($components as $key => $value) {
            if ($value !== null) {
                $availableWeight += $weights[$key];
            }
        }

        if ($availableWeight <= 0) {
            return [
                'sensor_score' => null,
                'severity_label' => null,
                'components' => $components,
                'weights' => $weights,
            ];
        }

        $score = 0.0;
        foreach ($components as $key => $value) {
            if ($value !== null) {
                $score += $value * ($weights[$key] / $availableWeight);
            }
        }

        $score = round($this->clamp($score), 2);

        return [
            'sensor_score' => $score,
            'severity_label' => $this->severityLabel($score),
            'components' => $components,
            'weights' => $weights,
        ];
    }

    public function calculateReportScore(iterable $reports): ?float
    {
        $scores = [];

        foreach ($reports as $report) {
            if ((string) $report->status !== 'verified') {
                continue;
            }

            $scores[] = $this->reportSeverity($report);
        }

        if ($scores === []) {
            return null;
        }

        return round(array_sum($scores) / count($scores), 2);
    }

    public function calculateMasterScore(?float $sensorScore, ?float $reportScore): ?float
    {
        if ($sensorScore === null && $reportScore === null) {
            return null;
        }

        if ($sensorScore === null) {
            return round($reportScore, 2);
        }

        if ($reportScore === null) {
            return round($sensorScore, 2);
        }

        $settings = SystemSetting::current();

        return round(((float) $settings->wbsi_sensor_weight * $sensorScore) + ((float) $settings->wbsi_report_weight * $reportScore), 2);
    }

    public function scoreTelemetryForDevice(Device $device, DeviceTelemetry $telemetry, ?float $reportScore = null): array
    {
        $sensor = $this->calculateSensorScore($telemetry, $device->environment_type ?? 'freshwater');
        $master = $this->calculateMasterScore($sensor['sensor_score'], $reportScore);

        return [
            ...$sensor,
            'report_score' => $reportScore,
            'master_wbsi' => $master,
            'master_severity_label' => $master === null ? null : $this->severityLabel($master),
        ];
    }

    public function nearbyReportScore(float $latitude, float $longitude, ?Carbon $from = null, ?Carbon $to = null, float $radiusKm = 5.0): ?float
    {
        $latDelta = $radiusKm / 111.0;
        $lngDelta = $radiusKm / max(1.0, 111.0 * cos(deg2rad($latitude)));

        $reports = Report::query()
            ->where('status', 'verified')
            ->whereBetween('latitude', [$latitude - $latDelta, $latitude + $latDelta])
            ->whereBetween('longitude', [$longitude - $lngDelta, $longitude + $lngDelta])
            ->when($from, fn ($query) => $query->where('created_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('created_at', '<=', $to))
            ->get()
            ->filter(fn (Report $report) => $this->distanceKm($latitude, $longitude, (float) $report->latitude, (float) $report->longitude) <= $radiusKm);

        return $this->calculateReportScore($reports);
    }

    public function severityLabel(float $score): string
    {
        if ($score < 25) {
            return 'Low';
        }
        if ($score < 50) {
            return 'Moderate';
        }
        if ($score < 75) {
            return 'High';
        }

        return 'Critical';
    }

    public function reportSeverity(Report $report): float
    {
        if ($report->severityPercentage !== null) {
            $percentage = (float) $report->severityPercentage;
            if ($percentage > 0.0) {
                return $this->clamp($percentage);
            }
        }

        $severity = strtolower((string) ($report->severityByAI ?: $report->severityByUser));
        if (trim($severity) === '') {
            return 0.0;
        }

        return match (true) {
            str_contains($severity, 'clean') => 12.5,
            str_contains($severity, 'low') => 12.5,
            str_contains($severity, 'medium'), str_contains($severity, 'moderate') => 37.5,
            str_contains($severity, 'high') => 62.5,
            str_contains($severity, 'critical') => 87.5,
            default => 50.0,
        };
    }

    private function weights(array $baseline): array
    {
        $standards = [
            'turbidity' => $baseline['turbidity_ntu'],
            'ph' => $baseline['ph_max'],
            'tds' => $baseline['tds_mg_l'],
            'temperature' => $baseline['temperature_max_celsius'] - $baseline['temperature_min_celsius'],
        ];

        $inverse = array_map(fn (float $value) => 1.0 / max($value, 0.0001), $standards);
        $total = array_sum($inverse);

        return array_map(fn (float $value) => $value / $total, $inverse);
    }

    public function settings(): SystemSetting
    {
        return SystemSetting::current();
    }

    public function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function baseline(string $environmentType): array
    {
        $settings = SystemSetting::current();

        if (strtolower($environmentType) === 'marine') {
            return [
                'ph_min' => (float) $settings->wbsi_marine_ph_min,
                'ph_max' => (float) $settings->wbsi_marine_ph_max,
                'turbidity_ntu' => (float) $settings->wbsi_marine_turbidity_ntu,
                'tds_mg_l' => (float) $settings->wbsi_marine_tds_mg_l,
                'temperature_min_celsius' => (float) $settings->wbsi_marine_temperature_min_celsius,
                'temperature_max_celsius' => (float) $settings->wbsi_marine_temperature_max_celsius,
            ];
        }

        return [
            'ph_min' => (float) $settings->wbsi_freshwater_ph_min,
            'ph_max' => (float) $settings->wbsi_freshwater_ph_max,
            'turbidity_ntu' => (float) $settings->wbsi_freshwater_turbidity_ntu,
            'tds_mg_l' => (float) $settings->wbsi_freshwater_tds_mg_l,
            'temperature_min_celsius' => (float) $settings->wbsi_freshwater_temperature_min_celsius,
            'temperature_max_celsius' => (float) $settings->wbsi_freshwater_temperature_max_celsius,
        ];
    }

    private function thresholdSeverity(float $value, float $limit): float
    {
        if ($value <= $limit) {
            return 0.0;
        }

        return $this->clamp((($value - $limit) / $limit) * 100.0);
    }

    private function rangeSeverity(float $value, float $min, float $max, float $capDistance): float
    {
        if ($value >= $min && $value <= $max) {
            return 0.0;
        }

        $distance = $value < $min ? $min - $value : $value - $max;

        return $this->clamp(($distance / $capDistance) * 100.0);
    }

    private function clamp(float $value): float
    {
        return max(0.0, min(100.0, $value));
    }

}
