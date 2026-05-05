<?php

namespace App\Console\Commands;

use App\Services\MqttBridgeService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class TestMqttConnection extends Command
{
    protected $signature = 'mqtt:test-connection';

    protected $description = 'Test connection to HiveMQ Cloud MQTT broker and verify subscriptions.';

    public function handle(MqttBridgeService $bridgeService): int
    {
        $this->info('Testing MQTT connection to HiveMQ Cloud...');

        try {
            $client = $bridgeService->createClient();
            $settings = $bridgeService->createConnectionSettings();

            $this->line('Connecting to ' . config('services.waterbase_mqtt.host') . ':' . config('services.waterbase_mqtt.port'));

            $client->connect($settings, true);
            $this->info('✓ Connected successfully!');

            // Register subscriptions
            $this->line('Registering subscriptions...');
            $bridgeService->registerSubscriptions($client);

            $this->info('✓ Subscriptions registered:');
            $this->line('  - ' . $bridgeService->discoveryTopicFilter());
            $this->line('  - ' . $bridgeService->telemetryTopicFilter());

            // Run loop for a few seconds to verify subscriptions are active
            $this->line('Listening for messages for 5 seconds...');
            for ($i = 0; $i < 5; $i++) {
                $client->loop(true, true);
                sleep(1);
                $this->line('  [' . ($i + 1) . '/5] Waiting...');
            }

            $client->disconnect();
            $this->info('✓ Test completed successfully!');

            Log::info('MQTT connection test passed', [
                'host' => config('services.waterbase_mqtt.host'),
                'port' => config('services.waterbase_mqtt.port'),
                'timestamp' => now()->toISOString(),
            ]);

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('✗ Connection failed: ' . $e->getMessage());

            Log::error('MQTT connection test failed', [
                'error' => $e->getMessage(),
                'host' => config('services.waterbase_mqtt.host'),
                'port' => config('services.waterbase_mqtt.port'),
            ]);

            return self::FAILURE;
        }
    }
}
