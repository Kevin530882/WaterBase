<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\User;
use App\Services\MqttBridgeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class DeviceCommandApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_publish_live_read_command_for_paired_device(): void
    {
        $user = $this->makeUser('admin');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:21',
            'station_id' => 'station-demo-21',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now(),
        ]);

        $bridge = Mockery::mock(MqttBridgeService::class)->makePartial();
        $bridge->shouldReceive('publishCommand')
            ->once()
            ->with('station-demo-21', Mockery::on(function (array $payload) use ($device) {
                return $payload['command_type'] === 'live_read'
                    && $payload['device_id'] === $device->id
                    && is_array($payload['payload']);
            }));

        app()->instance(MqttBridgeService::class, $bridge);

        $this->postJson('/api/devices/' . $device->id . '/commands', [
            'command_type' => 'live_read',
            'payload' => [
                'reason' => 'admin_check',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('command_type', 'live_read')
            ->assertJsonPath('station_id', 'station-demo-21');
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