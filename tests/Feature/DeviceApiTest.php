<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceActivityLog;
use App\Models\DeviceMaintenanceLog;
use App\Models\DeviceTelemetry;
use App\Models\Event;
use App\Models\MetricsDaily;
use App\Models\MetricsMonthly;
use App\Models\User;
use App\Services\DeviceRegistryService;
use App\Services\MqttBridgeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class DeviceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_pair_device_and_view_latest_telemetry(): void
    {
        $user = $this->makeUser('lgu');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:01',
            'name' => 'Demo Node',
            'status' => 'awaiting_pair',
            'discovery_last_seen_at' => now(),
            'raw_discovery_payload' => [
                'mac_address' => 'AA:BB:CC:DD:EE:01',
                'name' => 'Demo Node',
            ],
        ]);

        $bridge = Mockery::mock(MqttBridgeService::class);
        $bridge->shouldReceive('publishCommand')
            ->once()
            ->with('AA:BB:CC:DD:EE:01', Mockery::on(fn (array $payload) => $payload['command_type'] === 'pairing_confirmation'));
        app()->instance(MqttBridgeService::class, $bridge);

        $this->postJson('/api/devices/' . $device->id . '/pair', [
            'station_id' => 'station-demo-01',
            'name' => 'Main River Station',
        ])
            ->assertOk()
            ->assertJsonPath('device.station_id', 'station-demo-01')
            ->assertJsonPath('device.status', 'paired');

        $device->refresh();
        $this->assertSame('station-demo-01', $device->station_id);
        $this->assertSame('paired', $device->status);
        $this->assertSame($user->id, $device->paired_by_user_id);

        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => now()->subMinute(),
            'temperature_celsius' => 28.4,
            'ph' => 7.1,
            'turbidity_ntu' => 12.5,
            'tds_mg_l' => 146.2,
            'water_level_cm' => 22.1,
            'raw_payload' => ['source' => 'mqtt'],
        ]);

        $this->getJson('/api/devices/' . $device->id . '/telemetry/latest')
            ->assertOk()
            ->assertJsonPath('latest_telemetry.temperature_celsius', 28.4)
            ->assertJsonPath('latest_telemetry.ph', 7.1);
    }

    public function test_user_can_record_and_list_device_telemetry(): void
    {
        $user = $this->makeUser('admin');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:02',
            'station_id' => 'station-demo-02',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now(),
        ]);

        $this->postJson('/api/devices/' . $device->id . '/telemetry', [
            'recorded_at' => now()->toISOString(),
            'temperature_celsius' => 29.2,
            'ph' => 6.9,
            'turbidity_ntu' => 8.2,
            'tds_mg_l' => 151.8,
            'water_level_cm' => 18.7,
        ])
            ->assertCreated()
            ->assertJsonPath('telemetry.temperature_celsius', 29.2);

        $this->getJson('/api/devices/' . $device->id . '/telemetry?per_page=10')
            ->assertOk()
            ->assertJsonPath('total', 1);

        $this->getJson('/api/devices?status=paired')
            ->assertOk()
            ->assertJsonPath('total', 1);
    }

    public function test_all_device_telemetry_can_be_filtered_and_sorted(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        $alpha = $this->makeDevice('AA:BB:CC:DD:EE:10', 'alpha-station', 'Alpha River', 'online');
        $beta = $this->makeDevice('AA:BB:CC:DD:EE:11', 'beta-station', 'Beta Creek', 'offline');

        DeviceTelemetry::create([
            'device_id' => $alpha->id,
            'recorded_at' => '2026-05-01 08:00:00',
            'received_at' => '2026-05-01 08:00:02',
            'latency_ms' => 2000,
            'temperature_celsius' => 28.4,
            'ph' => 7.1,
            'turbidity_ntu' => 9.2,
            'tds_mg_l' => 145,
        ]);

        DeviceTelemetry::create([
            'device_id' => $beta->id,
            'recorded_at' => '2026-05-03 08:00:00',
            'received_at' => '2026-05-03 08:00:01',
            'latency_ms' => 1000,
            'temperature_celsius' => 31.2,
            'ph' => 6.8,
            'turbidity_ntu' => 18.5,
            'tds_mg_l' => 180,
        ]);

        $this->getJson('/api/device-telemetry?q=alpha&from=2026-05-01&to=2026-05-02&per_page=10')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.device.station_id', 'alpha-station');

        $this->getJson('/api/device-telemetry?status=offline&per_page=10')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.device.station_id', 'beta-station');

        $this->getJson('/api/device-telemetry?sort=ph&direction=asc&per_page=10')
            ->assertOk()
            ->assertJsonPath('data.0.device.station_id', 'beta-station')
            ->assertJsonPath('data.1.device.station_id', 'alpha-station');

        $this->getJson('/api/device-telemetry?sort=station_id&direction=desc&per_page=10')
            ->assertOk()
            ->assertJsonPath('data.0.device.station_id', 'beta-station')
            ->assertJsonPath('data.1.device.station_id', 'alpha-station');

        $this->getJson('/api/device-telemetry?sort=not_allowed&direction=asc&per_page=10')
            ->assertOk()
            ->assertJsonPath('data.0.device.station_id', 'beta-station');
    }

    public function test_device_telemetry_history_filters_are_scoped_to_the_device(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        $alpha = $this->makeDevice('AA:BB:CC:DD:EE:12', 'alpha-scope', 'Alpha Scope', 'online');
        $beta = $this->makeDevice('AA:BB:CC:DD:EE:13', 'beta-scope', 'Beta Scope', 'online');

        DeviceTelemetry::create([
            'device_id' => $alpha->id,
            'recorded_at' => '2026-05-01 08:00:00',
            'ph' => 7.1,
        ]);

        DeviceTelemetry::create([
            'device_id' => $beta->id,
            'recorded_at' => '2026-05-02 08:00:00',
            'ph' => 6.9,
        ]);

        $this->getJson('/api/devices/' . $alpha->id . '/telemetry?q=beta&per_page=10')
            ->assertOk()
            ->assertJsonPath('total', 0);

        $this->getJson('/api/devices/' . $alpha->id . '/telemetry?q=alpha&per_page=10')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.device.station_id', 'alpha-scope');
    }

    public function test_deleting_device_preserves_historical_records(): void
    {
        $user = $this->makeUser('admin');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:03',
            'station_id' => 'station-demo-03',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now(),
        ]);

        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => now()->subMinute(),
            'temperature_celsius' => 28.4,
        ]);

        DeviceActivityLog::create([
            'device_id' => $device->id,
            'user_id' => $user->id,
            'event_type' => 'command_sent',
            'description' => 'Test command',
            'metadata' => ['command_type' => 'live_read'],
        ]);

        DeviceMaintenanceLog::create([
            'device_id' => $device->id,
            'performed_by_user_id' => $user->id,
            'maintenance_type' => 'inspection',
            'performed_at' => now(),
        ]);

        MetricsDaily::create([
            'device_id' => $device->id,
            'date' => now()->toDateString(),
            'avg_ph' => 7.1,
            'reading_count' => 1,
        ]);

        MetricsMonthly::create([
            'device_id' => $device->id,
            'year_month' => now()->format('Y-m'),
            'avg_ph' => 7.1,
            'reading_count' => 1,
        ]);

        $bridge = Mockery::mock(MqttBridgeService::class);
        $bridge->shouldReceive('publishCommand')
            ->once()
            ->with('station-demo-03', Mockery::on(fn (array $payload) => $payload['command_type'] === 'unpair'));
        app()->instance(MqttBridgeService::class, $bridge);

        $this->deleteJson('/api/devices/' . $device->id)
            ->assertOk()
            ->assertJsonPath('message', 'Device deleted successfully');

        $this->assertSoftDeleted('devices', ['id' => $device->id]);
        $this->assertDatabaseHas('device_telemetries', ['device_id' => $device->id]);
        $this->assertDatabaseHas('device_activity_logs', ['device_id' => $device->id]);
        $this->assertDatabaseHas('device_maintenance_logs', ['device_id' => $device->id]);
        $this->assertDatabaseHas('metrics_daily', ['device_id' => $device->id]);
        $this->assertDatabaseHas('metrics_monthly', ['device_id' => $device->id]);

        $this->getJson('/api/devices')
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    public function test_rediscovery_restores_soft_deleted_device(): void
    {
        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:04',
            'station_id' => 'station-demo-04',
            'name' => 'Old Station',
            'status' => 'paired',
            'paired_at' => now(),
        ]);

        $device->delete();

        $restored = app(DeviceRegistryService::class)->registerDiscovery([
            'mac_address' => 'AA:BB:CC:DD:EE:04',
            'name' => 'Rediscovered Station',
            'firmware_version' => '1.0.1',
        ]);

        $this->assertSame($device->id, $restored->id);
        $this->assertFalse($restored->trashed());
        $this->assertSame('awaiting_pair', $restored->status);
        $this->assertNull($restored->station_id);
        $this->assertNull($restored->paired_at);
        $this->assertSame(1, Device::withTrashed()->where('mac_address', 'AA:BB:CC:DD:EE:04')->count());
    }

    public function test_organization_sensor_recommendation_returns_highest_scored_sensor_in_area(): void
    {
        $user = $this->makeUser('ngo');
        $user->forceFill([
            'bbox_south' => 14.0,
            'bbox_north' => 15.0,
            'bbox_west' => 120.0,
            'bbox_east' => 122.0,
        ])->save();
        Sanctum::actingAs($user);

        $lower = $this->makeDevice('AA:BB:CC:DD:EE:20', 'lower-station', 'Lower Station', 'online');
        $higher = $this->makeDevice('AA:BB:CC:DD:EE:21', 'higher-station', 'Higher Station', 'online');
        $outside = $this->makeDevice('AA:BB:CC:DD:EE:22', 'outside-station', 'Outside Station', 'online');
        $outside->forceFill(['latitude' => 16.0, 'longitude' => 123.0])->save();

        $this->recordTelemetry($lower, 8.0);
        $this->recordTelemetry($higher, 20.0);
        $this->recordTelemetry($outside, 40.0);

        $this->getJson('/api/organization/sensor-event-recommendation')
            ->assertOk()
            ->assertJsonPath('recommendation.source', 'sensor')
            ->assertJsonPath('recommendation.device_id', $higher->id)
            ->assertJsonPath('recommendation.station_id', 'higher-station');
    }

    public function test_organization_sensor_recommendation_is_null_below_threshold(): void
    {
        $user = $this->makeUser('lgu');
        $user->forceFill([
            'bbox_south' => 14.0,
            'bbox_north' => 15.0,
            'bbox_west' => 120.0,
            'bbox_east' => 122.0,
        ])->save();
        Sanctum::actingAs($user);

        $device = $this->makeDevice('AA:BB:CC:DD:EE:23', 'below-station', 'Below Station', 'online');
        $this->recordTelemetry($device, 6.0);

        $this->getJson('/api/organization/sensor-event-recommendation')
            ->assertOk()
            ->assertJsonPath('recommendation', null);
    }

    public function test_organization_sensor_recommendation_skips_sensors_with_open_nearby_events(): void
    {
        $user = $this->makeUser('ngo');
        $user->forceFill([
            'bbox_south' => 14.0,
            'bbox_north' => 15.0,
            'bbox_west' => 120.0,
            'bbox_east' => 122.0,
        ])->save();
        Sanctum::actingAs($user);

        $blocked = $this->makeDevice('AA:BB:CC:DD:EE:24', 'blocked-station', 'Blocked Station', 'online');
        $available = $this->makeDevice('AA:BB:CC:DD:EE:25', 'available-station', 'Available Station', 'online');
        $available->forceFill(['latitude' => 14.7, 'longitude' => 121.2])->save();

        $this->recordTelemetry($blocked, 30.0);
        $this->recordTelemetry($available, 10.0);

        Event::create([
            'title' => 'Existing cleanup',
            'address' => 'Blocked Station',
            'latitude' => $blocked->latitude,
            'longitude' => $blocked->longitude,
            'date' => now()->addDay()->toDateString(),
            'time' => '09:00',
            'duration' => 2,
            'description' => 'Already scheduled',
            'maxVolunteers' => 10,
            'points' => 20,
            'badge' => 'Volunteer',
            'status' => 'recruiting',
            'user_id' => $user->id,
        ]);

        $this->getJson('/api/organization/sensor-event-recommendation')
            ->assertOk()
            ->assertJsonPath('recommendation.device_id', $available->id);
    }

    private function makeUser(string $role): User
    {
        return User::create([
            'firstName' => ucfirst($role),
            'lastName' => 'Tester',
            'email' => uniqid($role . '.', true) . '@example.com',
            'password' => Hash::make('password123'),
            'phoneNumber' => '09123456789',
            'role' => $role,
            'organization' => $role === 'ngo' ? 'Water NGO' : null,
            'areaOfResponsibility' => 'Metro Manila',
            'push_notifications_enabled' => true,
            'push_pref_report_updates' => true,
            'push_pref_event_reminders' => true,
            'push_pref_achievements' => false,
            'push_quiet_hours_enabled' => false,
        ]);
    }

    private function makeDevice(string $macAddress, string $stationId, string $name, string $status): Device
    {
        return Device::create([
            'mac_address' => $macAddress,
            'station_id' => $stationId,
            'name' => $name,
            'status' => $status,
            'paired_at' => now(),
            'latitude' => 14.58,
            'longitude' => 121.0,
        ]);
    }

    private function recordTelemetry(Device $device, float $turbidity): DeviceTelemetry
    {
        return DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => now(),
            'received_at' => now(),
            'turbidity_ntu' => $turbidity,
        ]);
    }
}
