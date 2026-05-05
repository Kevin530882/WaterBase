<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DevicePerformanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_retrieve_performance_metrics(): void
    {
        $user = $this->makeUser('admin');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:10',
            'station_id' => 'perf-test-01',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now(),
        ]);

        $baseTime = now()->subHours(1);

        // Create test telemetries with known latencies
        for ($i = 0; $i < 10; $i++) {
            DeviceTelemetry::create([
                'device_id' => $device->id,
                'recorded_at' => $baseTime->copy()->addMinutes($i * 5),
                'received_at' => $baseTime->copy()->addMinutes($i * 5)->addMilliseconds(100 + ($i * 10)),
                'latency_ms' => 100 + ($i * 10),
                'temperature_celsius' => 25.0 + $i * 0.1,
            ]);
        }

        // Get metrics report
        $this->getJson('/api/devices/' . $device->id . '/performance?report_type=metrics')
            ->assertOk()
            ->assertJsonPath('message_count', 10)
            ->assertJsonPath('device_id', $device->id)
            ->assertJsonPath('station_id', 'perf-test-01')
            ->assertJsonStructure([
                'device_id',
                'station_id',
                'message_count',
                'average_latency_ms',
                'min_latency_ms',
                'max_latency_ms',
                'p50_latency_ms',
                'p95_latency_ms',
                'p99_latency_ms',
                'std_dev_ms',
                'period',
            ]);
    }

    public function test_user_can_retrieve_hourly_trends(): void
    {
        $user = $this->makeUser('lgu');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:11',
            'station_id' => 'trend-test-01',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now(),
        ]);

        $baseTime = now()->subDays(1)->setMinutes(0)->setSeconds(0);

        // Create readings across multiple hours
        for ($hour = 0; $hour < 3; $hour++) {
            for ($minute = 0; $minute < 3; $minute++) {
                DeviceTelemetry::create([
                    'device_id' => $device->id,
                    'recorded_at' => $baseTime->copy()->addHours($hour)->addMinutes($minute * 20),
                    'latency_ms' => 100 + ($hour * 10) + $minute,
                    'temperature_celsius' => 25.0 + $hour * 0.5,
                ]);
            }
        }

        // Get trends
        $response = $this->getJson('/api/devices/' . $device->id . '/performance?report_type=trends')
            ->assertOk();

        $trends = $response->json();
        $this->assertIsArray($trends);
        $this->assertGreaterThanOrEqual(2, count($trends));
        
        // Each trend should have expected fields
        foreach ($trends as $trend) {
            $this->assertArrayHasKey('hour', $trend);
            $this->assertArrayHasKey('message_count', $trend);
            $this->assertArrayHasKey('average_latency_ms', $trend);
        }
    }

    public function test_user_can_retrieve_delivery_metrics(): void
    {
        $user = $this->makeUser('volunteer');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:12',
            'station_id' => 'delivery-test-01',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now(),
        ]);

        $from = now()->subDays(1);
        $to = now();

        // Create some telemetries
        for ($i = 0; $i < 720; $i++) {
            DeviceTelemetry::create([
                'device_id' => $device->id,
                'recorded_at' => $from->copy()->addSeconds($i * 120), // Every 2 minutes
                'latency_ms' => 100,
            ]);
        }

        $this->getJson('/api/devices/' . $device->id . '/performance?report_type=delivery')
            ->assertOk()
            ->assertJsonStructure([
                'period',
                'expected_messages',
                'actual_messages',
                'delivery_rate_percent',
                'missing_messages',
            ])
            ->assertJsonPath('actual_messages', 720);
    }

    public function test_user_can_retrieve_full_performance_report(): void
    {
        $user = $this->makeUser('ngo');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:13',
            'station_id' => 'full-report-01',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now()->subDays(30),
        ]);

        $from = now()->subDays(30);

        // Create test telemetries
        for ($i = 0; $i < 100; $i++) {
            DeviceTelemetry::create([
                'device_id' => $device->id,
                'recorded_at' => $from->copy()->addHours($i),
                'latency_ms' => rand(50, 250),
            ]);
        }

        $this->getJson('/api/devices/' . $device->id . '/performance?report_type=full')
            ->assertOk()
            ->assertJsonStructure([
                'device',
                'period',
                'latency_metrics',
                'delivery_metrics',
                'hourly_trends',
                'generated_at',
            ]);
    }

    public function test_performance_endpoint_with_date_range(): void
    {
        $user = $this->makeUser('admin');
        Sanctum::actingAs($user);

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:14',
            'station_id' => 'date-range-test',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now(),
        ]);

        $now = now();

        // Create telemetries across 5 days
        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => $now->copy()->subDays(5),
            'latency_ms' => 100,
        ]);

        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => $now->copy()->subDays(3),
            'latency_ms' => 150,
        ]);

        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => $now->copy()->subDays(1),
            'latency_ms' => 120,
        ]);

        // Query with date range (last 2 days)
        $from = $now->copy()->subDays(2)->toDateString();
        $to = $now->toDateString();

        $response = $this->getJson("/api/devices/{$device->id}/performance?report_type=metrics&from={$from}&to={$to}")
            ->assertOk();

        $response->assertJsonPath('message_count', 1);
        $response->assertJsonPath('average_latency_ms', 120);
    }

    public function test_performance_endpoint_respects_authentication(): void
    {
        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:15',
            'station_id' => 'auth-test',
            'status' => 'paired',
        ]);

        // Without authentication
        $this->getJson('/api/devices/' . $device->id . '/performance')
            ->assertUnauthorized();
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
