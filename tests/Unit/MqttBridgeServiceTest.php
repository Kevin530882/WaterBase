<?php

namespace Tests\Unit;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Services\DeviceActivityLogService;
use App\Services\DeviceAnomalyService;
use App\Services\DeviceRegistryService;
use App\Services\MqttBridgeService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MqttBridgeServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_discovery_payload_creates_or_updates_device(): void
    {
        config()->set('services.waterbase_mqtt.topic_prefix', 'waterbase/devices');

        $bridge = new MqttBridgeService($this->makeRegistryService(), $this->makeAnomalyService());

        $bridge->handleDiscoveryMessage('waterbase/devices/AA:BB:CC:DD:EE:10/discovery', json_encode([
            'mac_address' => 'AA:BB:CC:DD:EE:10',
            'name' => 'River Node',
            'firmware_version' => '0.1.0',
            'hardware_revision' => 'rev-a',
        ]));

        $this->assertDatabaseHas('devices', [
            'mac_address' => 'AA:BB:CC:DD:EE:10',
            'name' => 'River Node',
            'status' => 'awaiting_pair',
        ]);
    }

    public function test_telemetry_payload_is_recorded_for_paired_device(): void
    {
        $bridge = new MqttBridgeService($this->makeRegistryService(), $this->makeAnomalyService());

        $device = Device::create([
            'mac_address' => 'AA:BB:CC:DD:EE:11',
            'station_id' => 'station-11',
            'status' => 'paired',
            'paired_at' => now(),
            'paired_by_user_id' => $this->makeUserId(),
        ]);

        $bridge->handleTelemetryMessage('waterbase/devices/station-11/telemetry', json_encode([
            'station_id' => 'station-11',
            'recorded_at' => now()->toISOString(),
            'temperature_celsius' => 30.2,
            'ph' => 7.0,
            'turbidity_ntu' => 9.4,
            'tds_mg_l' => 140.1,
            'water_level_cm' => 21.6,
        ]));

        $this->assertDatabaseHas('device_telemetries', [
            'device_id' => $device->id,
        ]);

        $this->assertSame(1, DeviceTelemetry::where('device_id', $device->id)->count());
    }

    public function test_create_client_uses_mqtt_configuration(): void
    {
        config()->set('services.waterbase_mqtt', [
            'host' => 'broker.example.com',
            'port' => 8883,
            'username' => 'user-1',
            'password' => 'secret-1',
            'client_id' => 'waterbase-bridge-test',
            'use_tls' => true,
            'ca_file' => null,
            'keep_alive_interval' => 30,
            'connect_timeout' => 10,
            'socket_timeout' => 10,
            'resend_timeout' => 10,
            'topic_prefix' => 'waterbase/devices',
        ]);

        $bridge = new MqttBridgeService($this->makeRegistryService(), $this->makeAnomalyService());
        $client = $bridge->createClient();

        $this->assertSame('broker.example.com', $client->getHost());
        $this->assertSame(8883, $client->getPort());
        $this->assertSame('waterbase-bridge-test', $client->getClientId());
    }

    private function makeRegistryService(): DeviceRegistryService
    {
        return new DeviceRegistryService(new DeviceActivityLogService());
    }

    private function makeAnomalyService(): DeviceAnomalyService
    {
        return new DeviceAnomalyService(new NotificationService(), new DeviceActivityLogService());
    }

    private function makeUserId(): int
    {
        return \App\Models\User::create([
            'firstName' => 'Bridge',
            'lastName' => 'Tester',
            'email' => uniqid('bridge.', true) . '@example.com',
            'password' => Hash::make('password123'),
            'phoneNumber' => '09123456789',
            'role' => 'admin',
            'push_notifications_enabled' => false,
        ])->id;
    }
}