<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
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