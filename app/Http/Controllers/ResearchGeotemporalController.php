<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\Event;
use App\Models\Report;
use App\Services\WbsiService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ResearchGeotemporalController extends Controller
{
    public function __construct(private readonly WbsiService $wbsiService)
    {
    }

    public function stations(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $devices = $this->stationQuery($request)
            ->with('latestTelemetry')
            ->orderBy('name')
            ->get();

        return response()->json($devices->map(fn (Device $device) => $this->stationPayload($device, $from, $to)));
    }

    public function readings(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $query = DeviceTelemetry::query()
            ->with('device')
            ->whereHas('device', fn ($deviceQuery) => $this->applyStationFilters($deviceQuery, $request))
            ->when($from, fn ($telemetryQuery) => $telemetryQuery->where('recorded_at', '>=', $from))
            ->when($to, fn ($telemetryQuery) => $telemetryQuery->where('recorded_at', '<=', $to))
            ->when($request->filled('station_id'), function ($telemetryQuery) use ($request) {
                $telemetryQuery->whereHas('device', fn ($deviceQuery) => $deviceQuery->where('station_id', $request->input('station_id')));
            })
            ->orderByDesc('recorded_at')
            ->limit($request->integer('limit', 500));

        return response()->json($query->get()->map(function (DeviceTelemetry $telemetry) {
            $device = $telemetry->device;
            $reportScore = $this->reportScoreForDevice($device);

            return [
                'id' => $telemetry->id,
                'station_id' => $device->station_id,
                'device_id' => $device->id,
                'recorded_at' => $telemetry->recorded_at,
                'temperature_celsius' => $telemetry->temperature_celsius,
                'ph' => $telemetry->ph,
                'tds_mg_l' => $telemetry->tds_mg_l,
                'turbidity_ntu' => $telemetry->turbidity_ntu,
                'scores' => $this->wbsiService->scoreTelemetryForDevice($device, $telemetry, $reportScore),
            ];
        }));
    }

    public function trends(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $parameter = $request->input('parameter', 'sensor_score');
        $aggregate = $request->input('aggregate', 'mean');

        $telemetries = DeviceTelemetry::query()
            ->with('device')
            ->whereHas('device', fn ($deviceQuery) => $this->applyStationFilters($deviceQuery, $request))
            ->when($from, fn ($query) => $query->where('recorded_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('recorded_at', '<=', $to))
            ->when($request->filled('station_id'), function ($query) use ($request) {
                $query->whereHas('device', fn ($deviceQuery) => $deviceQuery->where('station_id', $request->input('station_id')));
            })
            ->orderBy('recorded_at')
            ->get();

        $grouped = [];

        foreach ($telemetries as $telemetry) {
            $device = $telemetry->device;
            $reportScore = $this->reportScoreForDevice($device, $from, $to);
            $score = $this->wbsiService->scoreTelemetryForDevice($device, $telemetry, $reportScore);
            $value = $this->parameterValue($parameter, $telemetry, $score);

            if ($value === null) {
                continue;
            }

            $date = Carbon::parse($telemetry->recorded_at)->toDateString();
            $grouped[$date][] = (float) $value;
        }

        $trend = [];
        foreach ($grouped as $date => $values) {
            $trend[] = [
                'date' => $date,
                'value' => round($this->aggregate($values, $aggregate), 2),
                'count' => count($values),
            ];
        }

        usort($trend, fn ($a, $b) => strcmp($a['date'], $b['date']));

        return response()->json([
            'parameter' => $parameter,
            'aggregate' => $aggregate,
            'data' => $trend,
        ]);
    }

    public function summary(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $stations = $this->stationQuery($request)
            ->with('latestTelemetry')
            ->orderBy('name')
            ->get()
            ->map(fn (Device $device) => $this->stationPayload($device, $from, $to));

        $reports = Report::query()
            ->with('user:id,firstName,lastName,email')
            ->when($from, fn ($query) => $query->where('created_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('created_at', '<=', $to))
            ->when($this->bbox($request), fn ($query, $bbox) => $this->applyBbox($query, $bbox))
            ->orderByDesc('created_at')
            ->get();

        $reportScore = $this->wbsiService->calculateReportScore($reports);
        $sensorScores = $stations
            ->pluck('scores.sensor_score')
            ->filter(fn ($score) => $score !== null)
            ->values();
        $sensorScore = $sensorScores->isEmpty() ? null : round($sensorScores->avg(), 2);
        $master = $this->wbsiService->calculateMasterScore($sensorScore, $reportScore);

        return response()->json([
            'stations' => $stations,
            'reports' => $reports,
            'heatmap' => $this->heatmap($reports, $stations),
            'summary' => [
                'sensor_score' => $sensorScore,
                'report_score' => $reportScore,
                'master_wbsi' => $master,
                'severity_label' => $master === null ? null : $this->wbsiService->severityLabel($master),
                'station_count' => $stations->count(),
                'report_count' => $reports->count(),
            ],
        ]);
    }

    public function cleanups(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $events = Event::query()
            ->with('creator:id,firstName,lastName,organization,role')
            ->withCount('attendees')
            ->when($from, fn ($query) => $query->whereDate('date', '>=', $from->toDateString()))
            ->when($to, fn ($query) => $query->whereDate('date', '<=', $to->toDateString()))
            ->when($this->bbox($request), fn ($query, $bbox) => $this->applyBbox($query, $bbox))
            ->orderByDesc('date')
            ->get();

        $rankings = $events
            ->groupBy(fn (Event $event) => $event->creator?->organization ?: 'Unassigned')
            ->map(function ($items, string $organization) {
                return [
                    'organization' => $organization,
                    'events_count' => $items->count(),
                    'volunteers_count' => $items->sum('attendees_count'),
                    'active_count' => $items->where('status', 'active')->count(),
                    'completed_count' => $items->where('status', 'completed')->count(),
                ];
            })
            ->sortByDesc(fn ($item) => [$item['events_count'], $item['volunteers_count']])
            ->values();

        return response()->json([
            'events' => $events,
            'rankings' => $rankings,
        ]);
    }

    private function stationPayload(Device $device, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $latest = $device->latestTelemetry;
        $reportScore = $this->reportScoreForDevice($device, $from, $to);
        $scores = $latest ? $this->wbsiService->scoreTelemetryForDevice($device, $latest, $reportScore) : [
            'sensor_score' => null,
            'severity_label' => null,
            'report_score' => $reportScore,
            'master_wbsi' => $reportScore,
            'master_severity_label' => $reportScore === null ? null : $this->wbsiService->severityLabel($reportScore),
            'components' => [],
            'weights' => [],
        ];

        return [
            'id' => $device->id,
            'station_id' => $device->station_id,
            'name' => $device->name,
            'latitude' => $device->latitude,
            'longitude' => $device->longitude,
            'status' => $device->status,
            'environment_type' => $device->environment_type ?? 'freshwater',
            'last_seen_at' => $device->last_seen_at,
            'latest_telemetry' => $latest,
            'scores' => $scores,
        ];
    }

    private function stationQuery(Request $request)
    {
        $query = Device::query()
            ->whereNotNull('paired_at')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

        $this->applyStationFilters($query, $request);

        return $query;
    }

    private function applyStationFilters($query, Request $request): void
    {
        $query->when($this->bbox($request), fn ($q, $bbox) => $this->applyBbox($q, $bbox));
    }

    private function applyBbox($query, array $bbox): void
    {
        [$south, $west, $north, $east] = $bbox;

        $query->whereBetween('latitude', [$south, $north])
            ->whereBetween('longitude', [$west, $east]);
    }

    private function bbox(Request $request): ?array
    {
        if (!$request->filled('bbox')) {
            return null;
        }

        $values = array_map('floatval', explode(',', (string) $request->input('bbox')));

        return count($values) === 4 ? $values : null;
    }

    private function dateRange(Request $request): array
    {
        return [
            $request->filled('from') ? Carbon::parse($request->input('from'))->startOfDay() : null,
            $request->filled('to') ? Carbon::parse($request->input('to'))->endOfDay() : null,
        ];
    }

    private function reportScoreForDevice(Device $device, ?Carbon $from = null, ?Carbon $to = null): ?float
    {
        if ($device->latitude === null || $device->longitude === null) {
            return null;
        }

        return $this->wbsiService->nearbyReportScore((float) $device->latitude, (float) $device->longitude, $from, $to);
    }

    private function parameterValue(string $parameter, DeviceTelemetry $telemetry, array $score): ?float
    {
        return match ($parameter) {
            'ph' => $telemetry->ph === null ? null : (float) $telemetry->ph,
            'tds' => $telemetry->tds_mg_l === null ? null : (float) $telemetry->tds_mg_l,
            'turbidity' => $telemetry->turbidity_ntu === null ? null : (float) $telemetry->turbidity_ntu,
            'temperature' => $telemetry->temperature_celsius === null ? null : (float) $telemetry->temperature_celsius,
            'master_wbsi' => $score['master_wbsi'],
            'report_score' => $score['report_score'],
            default => $score['sensor_score'],
        };
    }

    private function aggregate(array $values, string $aggregate): float
    {
        return match ($aggregate) {
            'min', 'lowest' => min($values),
            'max', 'highest' => max($values),
            'latest' => $values[array_key_last($values)],
            default => array_sum($values) / count($values),
        };
    }

    private function heatmap($reports, $stations): array
    {
        $reportPoints = $reports->map(fn (Report $report) => [
            'latitude' => (float) $report->latitude,
            'longitude' => (float) $report->longitude,
            'intensity' => $this->wbsiService->reportSeverity($report) / 100,
            'type' => 'report',
        ]);

        $stationPoints = $stations
            ->filter(fn ($station) => data_get($station, 'scores.sensor_score') !== null)
            ->map(fn ($station) => [
                'latitude' => (float) $station['latitude'],
                'longitude' => (float) $station['longitude'],
                'intensity' => data_get($station, 'scores.sensor_score') / 100,
                'type' => 'sensor',
            ]);

        return $reportPoints->concat($stationPoints)->values()->all();
    }
}
