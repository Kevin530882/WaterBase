<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\Event;
use App\Models\User;
use App\Services\DeviceActivityLogService;
use App\Services\DeviceRegistryService;
use App\Services\DevicePerformanceService;
use App\Services\DeviceMaintenanceService;
use App\Services\MetricsAggregationService;
use App\Services\MqttBridgeService;
use App\Services\WbsiService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeviceController extends Controller
{
    private const SENSOR_EVENT_THRESHOLD = 25.0;
    private const EVENT_DUPLICATE_RADIUS_KM = 0.1;

    public function __construct(
        protected DeviceRegistryService $deviceRegistryService,
        protected MqttBridgeService $mqttBridgeService,
        protected DevicePerformanceService $performanceService,
        protected DeviceMaintenanceService $maintenanceService,
        protected MetricsAggregationService $metricsService,
        protected DeviceActivityLogService $activityLogService,
        protected WbsiService $wbsiService,
    )
    {
    }

    public function index(Request $request)
    {
        $devices = Device::query()
            ->with(['pairedByUser:id,firstName,lastName,organization', 'latestTelemetry'])
            ->withCount('telemetry')
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->orderByDesc('updated_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($devices);
    }

    public function show(Device $device)
    {
        $device->load(['pairedByUser:id,firstName,lastName,organization', 'latestTelemetry', 'maintenanceSchedule', 'maintenanceLogs']);
        $device->loadCount('telemetry');

        return response()->json([
            'device' => $device,
        ]);
    }

    public function discovered(Request $request)
    {
        $devices = Device::query()
            ->discovered()
            ->with(['latestTelemetry'])
            ->orderByDesc('discovery_last_seen_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($devices);
    }

    public function destroy(Device $device)
    {
        // Notify the device to clear its persisted state before deleting the DB record.
        // If the device is offline it will miss this command; the MQTT bridge handles
        // that case by publishing unpair when telemetry arrives for an unknown station.
        $this->mqttBridgeService->publishCommand(
            $device->station_id ?? $device->mac_address,
            ['command_type' => 'unpair']
        );

        $device->delete();

        return response()->json([
            'message' => 'Device deleted successfully',
        ]);
    }

    public function pair(Request $request, Device $device)
    {
        $validated = $request->validate([
            'station_id' => [
                'required',
                'string',
                'max:255',
                Rule::unique('devices', 'station_id')->ignore($device->id),
            ],
            'name' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $pairedDevice = $this->deviceRegistryService->pairDevice(
            $device,
            $request->user(),
            $validated['station_id'],
            $validated['name'] ?? null,
            isset($validated['latitude']) ? (float) $validated['latitude'] : null,
            isset($validated['longitude']) ? (float) $validated['longitude'] : null
        );

        // Create default maintenance schedule
        $this->maintenanceService->createDefaultSchedule($pairedDevice);

        // Notify the device via MQTT so it transitions out of discovery mode.
        $this->mqttBridgeService->publishCommand($device->mac_address, [
            'command_type' => 'pairing_confirmation',
            'station_id' => $validated['station_id'],
        ]);

        return response()->json([
            'message' => 'Device paired successfully',
            'device' => $pairedDevice->load(['pairedByUser:id,firstName,lastName,organization', 'latestTelemetry']),
        ]);
    }

    public function updateLocation(Request $request, Device $device)
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $this->deviceRegistryService->updateDeviceLocation(
            $device,
            (float) $validated['latitude'],
            (float) $validated['longitude']
        );

        return response()->json([
            'message' => 'Device location updated',
            'device' => $device->fresh(),
        ]);
    }

    public function calibrate(Request $request, Device $device)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $log = $this->maintenanceService->recordCalibration(
            $device,
            $request->user()->id,
            $validated['notes'] ?? null
        );

        return response()->json([
            'message' => 'Calibration recorded',
            'log' => $log,
            'schedule' => $device->fresh()->maintenanceSchedule,
        ]);
    }

    public function maintenance(Device $device)
    {
        return response()->json([
            'schedule' => $device->maintenanceSchedule,
            'logs' => $device->maintenanceLogs()->orderByDesc('performed_at')->get(),
        ]);
    }

    public function updateMaintenanceSchedule(Request $request, Device $device)
    {
        $validated = $request->validate([
            'calibration_interval_days' => 'required|integer|min:1|max:365',
            'reminder_days_before' => 'required|integer|min:1|max:90',
        ]);

        $schedule = $this->maintenanceService->updateSchedule(
            $device,
            $validated['calibration_interval_days'],
            $validated['reminder_days_before']
        );

        return response()->json([
            'message' => 'Maintenance schedule updated',
            'schedule' => $schedule,
        ]);
    }

    public function overdueMaintenance()
    {
        $devices = $this->maintenanceService->getOverdueDevices();

        return response()->json([
            'devices' => $devices,
        ]);
    }

    public function upcomingMaintenance(Request $request)
    {
        $days = $request->integer('days', 14);
        $devices = $this->maintenanceService->getUpcomingDevices($days);

        return response()->json([
            'devices' => $devices,
        ]);
    }

    public function dailyMetrics(Request $request, Device $device)
    {
        $validated = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $query = $device->metricsDaily()->orderByDesc('date');

        if (!empty($validated['from'])) {
            $query->where('date', '>=', $validated['from']);
        }
        if (!empty($validated['to'])) {
            $query->where('date', '<=', $validated['to']);
        }

        return response()->json($query->get());
    }

    public function monthlyMetrics(Request $request, Device $device)
    {
        $validated = $request->validate([
            'from' => 'nullable|string|size:7',
            'to' => 'nullable|string|size:7',
        ]);

        $query = $device->metricsMonthly()->orderByDesc('year_month');

        if (!empty($validated['from'])) {
            $query->where('year_month', '>=', $validated['from']);
        }
        if (!empty($validated['to'])) {
            $query->where('year_month', '<=', $validated['to']);
        }

        return response()->json($query->get());
    }

    public function liveRead(Request $request, Device $device)
    {
        $this->mqttBridgeService->publishCommand($device->station_id ?? $device->mac_address, [
            'command_type' => 'live_read',
            'device_id' => $device->id,
        ]);

        $this->activityLogService->logCommandSent($device, 'live_read', $request->user()->id);

        return response()->json([
            'message' => 'Live read command published',
            'station_id' => $device->station_id ?? $device->mac_address,
        ]);
    }

    public function mapDevices(Request $request)
    {
        $devices = Device::query()
            ->whereNotNull('paired_at')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->with('latestTelemetry')
            ->get();

        return response()->json($devices->map(function (Device $device) {
            return [
                'id' => $device->id,
                'station_id' => $device->station_id,
                'name' => $device->name,
                'latitude' => $device->latitude,
                'longitude' => $device->longitude,
                'status' => $device->status,
                'environment_type' => $device->environment_type ?? 'freshwater',
                'last_seen_at' => $device->last_seen_at,
                'latest_telemetry' => $device->latestTelemetry,
                'scores' => $device->latestTelemetry
                    ? $this->wbsiService->scoreTelemetryForDevice(
                        $device,
                        $device->latestTelemetry,
                        $this->wbsiService->nearbyReportScore((float) $device->latitude, (float) $device->longitude)
                    )
                    : null,
            ];
        }));
    }

    public function sensorEventRecommendation(Request $request)
    {
        $user = $request->user();

        if (!$user || !in_array(strtolower((string) $user->role), User::ORGANIZATION_ROLES, true)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$this->hasGeographicBounds($user)) {
            return response()->json(['recommendation' => null]);
        }

        $recommendation = Device::query()
            ->whereNotNull('paired_at')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->whereBetween('latitude', [$user->bbox_south, $user->bbox_north])
            ->whereBetween('longitude', [$user->bbox_west, $user->bbox_east])
            ->with('latestTelemetry')
            ->get()
            ->filter(fn (Device $device) => $device->latestTelemetry !== null)
            ->map(function (Device $device) {
                $scores = $this->wbsiService->scoreTelemetryForDevice(
                    $device,
                    $device->latestTelemetry,
                    $this->wbsiService->nearbyReportScore((float) $device->latitude, (float) $device->longitude)
                );

                $score = $scores['master_wbsi'] ?? $scores['sensor_score'];

                return [
                    'device' => $device,
                    'scores' => $scores,
                    'score' => $score === null ? null : (float) $score,
                ];
            })
            ->filter(fn (array $candidate) => $candidate['score'] !== null && $candidate['score'] >= self::SENSOR_EVENT_THRESHOLD)
            ->sortByDesc('score')
            ->first(fn (array $candidate) => !$this->hasNearbyOpenEvent($candidate['device']));

        if (!$recommendation) {
            return response()->json(['recommendation' => null]);
        }

        /** @var Device $device */
        $device = $recommendation['device'];
        $scores = $recommendation['scores'];

        return response()->json([
            'recommendation' => [
                'source' => 'sensor',
                'device_id' => $device->id,
                'station_id' => $device->station_id,
                'name' => $device->name,
                'latitude' => $device->latitude,
                'longitude' => $device->longitude,
                'wbsi_score' => $recommendation['score'],
                'severity_label' => $scores['master_severity_label'] ?? $scores['severity_label'],
                'latest_telemetry' => $device->latestTelemetry,
                'last_seen_at' => $device->last_seen_at,
            ],
        ]);
    }

    public function activityLogs(Request $request, Device $device)
    {
        $logs = $device->activityLogs()
            ->with('user:id,firstName,lastName')
            ->paginate($request->integer('per_page', 20));

        return response()->json($logs);
    }

    private function hasGeographicBounds(User $user): bool
    {
        return $user->bbox_south !== null
            && $user->bbox_north !== null
            && $user->bbox_west !== null
            && $user->bbox_east !== null;
    }

    private function hasNearbyOpenEvent(Device $device): bool
    {
        $latitude = (float) $device->latitude;
        $longitude = (float) $device->longitude;
        $latDelta = self::EVENT_DUPLICATE_RADIUS_KM / 111.0;
        $lngDelta = self::EVENT_DUPLICATE_RADIUS_KM / max(1.0, 111.0 * cos(deg2rad($latitude)));

        return Event::query()
            ->whereIn('status', ['recruiting', 'active'])
            ->whereBetween('latitude', [$latitude - $latDelta, $latitude + $latDelta])
            ->whereBetween('longitude', [$longitude - $lngDelta, $longitude + $lngDelta])
            ->get()
            ->contains(fn (Event $event) => $this->wbsiService->distanceKm(
                $latitude,
                $longitude,
                (float) $event->latitude,
                (float) $event->longitude
            ) <= self::EVENT_DUPLICATE_RADIUS_KM);
    }

    public function storeTelemetry(Request $request, Device $device)
    {
        $validated = $request->validate([
            'recorded_at' => 'nullable|date',
            'temperature_celsius' => 'nullable|numeric',
            'ph' => 'nullable|numeric',
            'turbidity_ntu' => 'nullable|numeric',
            'tds_mg_l' => 'nullable|numeric',
            'water_level_cm' => 'nullable|numeric',
        ]);

        $telemetry = $this->deviceRegistryService->recordTelemetry($device, $validated);

        return response()->json([
            'message' => 'Telemetry recorded successfully',
            'telemetry' => $telemetry,
        ], 201);
    }

    public function latest(Device $device)
    {
        return response()->json([
            'device' => $device->load('latestTelemetry'),
            'latest_telemetry' => $device->latestTelemetry,
        ]);
    }

    public function telemetry(Request $request)
    {
        return response()->json($this->telemetryQuery($request)->paginate($this->telemetryPerPage($request)));
    }

    public function history(Request $request, Device $device)
    {
        $telemetry = $this->telemetryQuery($request, $device)->paginate($this->telemetryPerPage($request));

        return response()->json($telemetry);
    }

    public function command(Request $request, Device $device)
    {
        $validated = $request->validate([
            'command_type' => 'required|string|in:pairing_confirmation,live_read,unpair',
            'payload' => 'nullable|array',
        ]);

        $this->mqttBridgeService->publishCommand($device->station_id ?? $device->mac_address, [
            'command_type' => $validated['command_type'],
            'payload' => $validated['payload'] ?? [],
            'device_id' => $device->id,
        ]);

        $this->activityLogService->logCommandSent($device, $validated['command_type'], $request->user()->id);

        return response()->json([
            'message' => 'Command published successfully',
            'station_id' => $device->station_id ?? $device->mac_address,
            'command_type' => $validated['command_type'],
        ]);
    }

    public function performance(Request $request, Device $device)
    {
        $validated = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'report_type' => 'nullable|string|in:metrics,trends,delivery,full',
        ]);

        $from = isset($validated['from']) ? \Carbon\Carbon::parse($validated['from']) : null;
        $to = isset($validated['to']) ? \Carbon\Carbon::parse($validated['to']) : null;
        $reportType = $validated['report_type'] ?? 'metrics';

        $response = match ($reportType) {
            'metrics' => $this->performanceService->getDeviceMetrics($device, $from, $to),
            'trends' => $this->performanceService->getHourlyTrends($device, $from, $to),
            'delivery' => $this->performanceService->getDeliveryRate($device, $from, $to),
            'full' => $this->performanceService->generatePerformanceReport($device, $from, $to),
        };

        return response()->json($response);
    }

    private function telemetryQuery(Request $request, ?Device $device = null)
    {
        $validated = $request->validate([
            'q' => 'nullable|string|max:255',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'status' => 'nullable|string|max:50',
            'sort' => 'nullable|string',
            'direction' => 'nullable|string|in:asc,desc',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $sort = $validated['sort'] ?? 'recorded_at';
        $direction = $validated['direction'] ?? 'desc';
        $telemetrySorts = [
            'recorded_at',
            'received_at',
            'latency_ms',
            'temperature_celsius',
            'ph',
            'turbidity_ntu',
            'tds_mg_l',
        ];

        if (!in_array($sort, [...$telemetrySorts, 'station_id', 'device_name'], true)) {
            $sort = 'recorded_at';
            $direction = 'desc';
        }

        $query = DeviceTelemetry::query()
            ->select('device_telemetries.*')
            ->with('device:id,station_id,name,mac_address,status')
            ->whereHas('device')
            ->when($device, fn ($telemetryQuery) => $telemetryQuery->where('device_id', $device->id))
            ->when(isset($validated['from']), fn ($telemetryQuery) => $telemetryQuery->where('recorded_at', '>=', $validated['from']))
            ->when(isset($validated['to']), fn ($telemetryQuery) => $telemetryQuery->where('recorded_at', '<=', $validated['to']))
            ->when(!empty($validated['status']), function ($telemetryQuery) use ($validated) {
                $telemetryQuery->whereHas('device', fn ($deviceQuery) => $deviceQuery->where('status', $validated['status']));
            })
            ->when(!empty($validated['q']), function ($telemetryQuery) use ($validated) {
                $search = $validated['q'];
                $telemetryQuery->whereHas('device', function ($deviceQuery) use ($search) {
                    $deviceQuery
                        ->where('station_id', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('mac_address', 'like', "%{$search}%");
                });
            });

        if ($sort === 'station_id' || $sort === 'device_name') {
            $column = $sort === 'station_id' ? 'devices.station_id' : 'devices.name';
            $query
                ->join('devices', 'devices.id', '=', 'device_telemetries.device_id')
                ->orderBy($column, $direction)
                ->orderByDesc('device_telemetries.recorded_at');
        } else {
            $query->orderBy("device_telemetries.{$sort}", $direction);
        }

        return $query;
    }

    private function telemetryPerPage(Request $request): int
    {
        return $request->integer('per_page', 20);
    }
}
