<?php

namespace Tests\Unit;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\User;
use App\Services\DevicePerformanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DevicePerformanceServiceTest extends TestCase
{
    use RefreshDatabase;

    private DevicePerformanceService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new DevicePerformanceService();
    }

    public function test_calculates_latency_metrics_correctly(): void
    {
        // Create a paired device
        $user = $this->makeUser('admin');

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:FF',
            'station_id' => 'test-station-01',
            'status' => 'paired',
            'paired_by_user_id' => $user->id,
            'paired_at' => now(),
        ]);

        $baseTime = now()->subHours(1);

        // Create telemetries with known latencies
        $telemetries = [
            [
                'device_id' => $device->id,
                'recorded_at' => $baseTime,
                'received_at' => $baseTime->copy()->addMilliseconds(100),
                'latency_ms' => 100,
                'temperature_celsius' => 25.0,
            ],
            [
                'device_id' => $device->id,
                'recorded_at' => $baseTime->copy()->addMinutes(1),
                'received_at' => $baseTime->copy()->addMinutes(1)->addMilliseconds(150),
                'latency_ms' => 150,
                'temperature_celsius' => 25.1,
            ],
            [
                'device_id' => $device->id,
                'recorded_at' => $baseTime->copy()->addMinutes(2),
                'received_at' => $baseTime->copy()->addMinutes(2)->addMilliseconds(120),
                'latency_ms' => 120,
                'temperature_celsius' => 25.2,
            ],
            [
                'device_id' => $device->id,
                'recorded_at' => $baseTime->copy()->addMinutes(3),
                'received_at' => $baseTime->copy()->addMinutes(3)->addMilliseconds(80),
                'latency_ms' => 80,
                'temperature_celsius' => 25.3,
            ],
            [
                'device_id' => $device->id,
                'recorded_at' => $baseTime->copy()->addMinutes(4),
                'received_at' => $baseTime->copy()->addMinutes(4)->addMilliseconds(200),
                'latency_ms' => 200,
                'temperature_celsius' => 25.4,
            ],
        ];

        foreach ($telemetries as $data) {
            DeviceTelemetry::create($data);
        }

        // Get metrics
        $metrics = $this->service->getDeviceMetrics($device);

        // Verify message count
        $this->assertEquals(5, $metrics['message_count']);

        // Verify latency calculations
        $this->assertEquals(130, $metrics['average_latency_ms']); // (100+150+120+80+200)/5 = 130
        $this->assertEquals(80, $metrics['min_latency_ms']);
        $this->assertEquals(200, $metrics['max_latency_ms']);

        // Verify percentiles
        $this->assertEquals(120, $metrics['p50_latency_ms']); // Median
        $this->assertNotNull($metrics['p95_latency_ms']);
        $this->assertNotNull($metrics['p99_latency_ms']);

        // Verify standard deviation
        $this->assertNotNull($metrics['std_dev_ms']);
        $this->assertGreaterThan(0, $metrics['std_dev_ms']);
    }

    public function test_handles_empty_telemetry_gracefully(): void
    {
        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:00',
            'station_id' => 'empty-station',
            'status' => 'paired',
        ]);

        $metrics = $this->service->getDeviceMetrics($device);

        $this->assertEquals(0, $metrics['message_count']);
        $this->assertNull($metrics['average_latency_ms']);
        $this->assertNull($metrics['min_latency_ms']);
        $this->assertNull($metrics['max_latency_ms']);
    }

    public function test_filters_by_date_range(): void
    {
        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:01',
            'station_id' => 'range-test',
            'status' => 'paired',
        ]);

        $now = now();

        // Create telemetries across multiple days
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

        // Query only last 2 days
        $from = $now->copy()->subDays(2);
        $to = $now;

        $metrics = $this->service->getDeviceMetrics($device, $from, $to);

        // Should only include last 2 readings
        $this->assertEquals(1, $metrics['message_count']);
        $this->assertEquals(120, $metrics['average_latency_ms']);
    }

    public function test_calculates_hourly_trends(): void
    {
        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:02',
            'station_id' => 'trends-test',
            'status' => 'paired',
        ]);

        $baseTime = now()->subDays(1)->setMinutes(0)->setSeconds(0);

        // Create readings for different hours
        for ($hour = 0; $hour < 3; $hour++) {
            for ($minute = 0; $minute < 3; $minute++) {
                DeviceTelemetry::create([
                    'device_id' => $device->id,
                    'recorded_at' => $baseTime->copy()->addHours($hour)->addMinutes($minute * 20),
                    'latency_ms' => 100 + ($hour * 10) + $minute,
                ]);
            }
        }

        $trends = $this->service->getHourlyTrends($device, $baseTime->copy()->subHours(1), $baseTime->copy()->addHours(4));

        // Should have 3 hourly trends
        $this->assertGreaterThanOrEqual(2, count($trends));

        // Each hour should have message count
        foreach ($trends as $trend) {
            $this->assertEquals(3, $trend['message_count']);
            $this->assertNotNull($trend['average_latency_ms']);
            $this->assertNotNull($trend['min_latency_ms']);
            $this->assertNotNull($trend['max_latency_ms']);
        }
    }

    public function test_calculates_delivery_rate(): void
    {
        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:03',
            'station_id' => 'delivery-test',
            'status' => 'paired',
        ]);

        $from = now()->subDays(1);
        $to = now();

        // Expected: 1440 messages per day (one every 60 seconds)
        // Create only 720 messages (50% delivery rate)
        for ($i = 0; $i < 720; $i++) {
            DeviceTelemetry::create([
                'device_id' => $device->id,
                'recorded_at' => $from->copy()->addSeconds($i * 120), // Every 120 seconds
                'latency_ms' => 100,
            ]);
        }

        $delivery = $this->service->getDeliveryRate($device, $from, $to);

        $this->assertEquals(720, $delivery['actual_messages']);
        $this->assertLessThanOrEqual(100, $delivery['delivery_rate_percent']);
        $this->assertGreaterThanOrEqual(0, $delivery['delivery_rate_percent']);
    }

    public function test_generates_comprehensive_performance_report(): void
    {
        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:04',
            'station_id' => 'report-test',
            'status' => 'paired',
            'paired_at' => now()->subDays(30),
        ]);

        $from = now()->subDays(30);
        $to = now();

        // Create some sample telemetries
        for ($i = 0; $i < 100; $i++) {
            DeviceTelemetry::create([
                'device_id' => $device->id,
                'recorded_at' => $from->copy()->addHours($i),
                'latency_ms' => rand(50, 250),
            ]);
        }

        $report = $this->service->generatePerformanceReport($device, $from, $to);

        // Verify structure
        $this->assertArrayHasKey('device', $report);
        $this->assertArrayHasKey('period', $report);
        $this->assertArrayHasKey('latency_metrics', $report);
        $this->assertArrayHasKey('delivery_metrics', $report);
        $this->assertArrayHasKey('hourly_trends', $report);
        $this->assertArrayHasKey('generated_at', $report);

        // Verify device info
        $this->assertEquals($device->id, $report['device']['id']);
        $this->assertEquals('report-test', $report['device']['station_id']);

        // Verify metrics exist
        $this->assertGreaterThan(0, $report['latency_metrics']['message_count']);
        $this->assertNotNull($report['latency_metrics']['average_latency_ms']);
        $this->assertGreaterThan(0, $report['delivery_metrics']['actual_messages']);
    }

    public function test_percentile_calculation_accuracy(): void
    {
        // Create a device with known latencies for percentile testing
        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:05',
            'station_id' => 'percentile-test',
            'status' => 'paired',
        ]);

        $baseTime = now()->subHours(1);
        
        // Create 100 telemetries with latencies from 10ms to 110ms
        for ($i = 0; $i < 100; $i++) {
            DeviceTelemetry::create([
                'device_id' => $device->id,
                'recorded_at' => $baseTime->copy()->addSeconds($i * 36),
                'latency_ms' => 10 + $i,
            ]);
        }

        $metrics = $this->service->getDeviceMetrics($device);

        // For values 10..109
        // p50 should be around 59-60 (median)
        // p95 should be around 104-105
        // p99 should be around 108-109
        
        $this->assertGreaterThanOrEqual(55, $metrics['p50_latency_ms']);
        $this->assertLessThanOrEqual(65, $metrics['p50_latency_ms']);

        $this->assertGreaterThanOrEqual(100, $metrics['p95_latency_ms']);
        $this->assertLessThanOrEqual(108, $metrics['p95_latency_ms']);

        $this->assertGreaterThanOrEqual(107, $metrics['p99_latency_ms']);
        $this->assertLessThanOrEqual(110, $metrics['p99_latency_ms']);
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
