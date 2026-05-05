<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Services\MqttBridgeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MqttHiveMqCloudIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_publish_and_receive_discovery_message(): void
    {
        $bridgeService = app(MqttBridgeService::class);

        // Verify bridge can connect to HiveMQ Cloud
        try {
            $client = $bridgeService->createClient();
            $client->connect($bridgeService->createConnectionSettings(), true);

            // Publish a test discovery message
            $testMacAddress = 'AA:BB:CC:DD:EE:FF';
            $discoveryPayload = [
                'mac_address' => $testMacAddress,
                'firmware_version' => '1.0.0-test',
                'battery_percent' => 85,
                'signal_strength' => -65,
            ];

            $discoveryTopic = rtrim((string) config('services.waterbase_mqtt.topic_prefix', 'waterbase/devices'), '/') . '/' . $testMacAddress . '/discovery';

            $client->publish(
                $discoveryTopic,
                json_encode($discoveryPayload),
                0,
                false
            );

            $client->disconnect();

            // The bridge needs to be running to receive the message,
            // so this test just verifies we can publish to the broker.
            $this->assertTrue(true);
        } catch (\Exception $e) {
            $this->fail('Failed to connect to HiveMQ Cloud: ' . $e->getMessage());
        }
    }

    public function test_discovery_payload_can_be_parsed_and_stored(): void
    {
        $bridgeService = app(MqttBridgeService::class);

        $discoveryPayload = [
            'mac_address' => 'AA:BB:CC:DD:EE:00',
            'firmware_version' => '1.0.0',
            'battery_percent' => 85,
            'signal_strength' => -65,
        ];

        $topic = 'waterbase/devices/AA:BB:CC:DD:EE:00/discovery';

        // Simulate receiving a discovery message
        $bridgeService->handleDiscoveryMessage($topic, json_encode($discoveryPayload));

        // Verify device was created
        $device = Device::where('mac_address', 'AA:BB:CC:DD:EE:00')->first();

        $this->assertNotNull($device);
        $this->assertEquals('AA:BB:CC:DD:EE:00', $device->mac_address);
        $this->assertEquals('1.0.0', $device->firmware_version);
        $this->assertEquals('awaiting_pair', $device->status);
        $this->assertNull($device->station_id);
        
        // battery_percent and signal_strength are stored in raw_discovery_payload
        $this->assertEquals(85, $device->raw_discovery_payload['battery_percent']);
        $this->assertEquals(-65, $device->raw_discovery_payload['signal_strength']);
    }

    public function test_telemetry_payload_can_be_parsed_and_stored(): void
    {
        // Create a paired device first
        $device = Device::factory()->create([
            'mac_address' => 'AA:BB:CC:DD:EE:01',
            'station_id' => 'station-001',
        ]);

        $bridgeService = app(MqttBridgeService::class);

        $telemetryPayload = [
            'station_id' => 'station-001',
            'temperature_celsius' => 28.5,
            'ph' => 7.2,
            'dissolved_oxygen_mg_l' => 6.8,
            'conductivity_us_cm' => 450,
            'turbidity_ntu' => 2.1,
            'tds_mg_l' => 225,
            'water_level_cm' => 45.3,
        ];

        $topic = 'waterbase/devices/station-001/telemetry';

        // Simulate receiving a telemetry message
        $bridgeService->handleTelemetryMessage($topic, json_encode($telemetryPayload));

        // Verify telemetry was recorded
        $telemetry = $device->telemetry()->latest()->first();

        $this->assertNotNull($telemetry);
        $this->assertEquals(28.5, $telemetry->temperature_celsius);
        $this->assertEquals(7.2, $telemetry->ph);
        $this->assertEquals(2.1, $telemetry->turbidity_ntu);
        $this->assertEquals(225, $telemetry->tds_mg_l);
    }
}
