<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceActivityLog;
use App\Models\DeviceMaintenanceLog;
use App\Models\DeviceTelemetry;
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
}
