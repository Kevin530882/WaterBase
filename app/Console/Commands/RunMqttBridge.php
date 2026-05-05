<?php

namespace App\Console\Commands;

use App\Services\MqttBridgeService;
use Illuminate\Console\Command;

class RunMqttBridge extends Command
{
    protected $signature = 'iot:mqtt-bridge';

    protected $description = 'Run the HiveMQ Cloud MQTT bridge for device discovery and telemetry';

    public function __construct(protected MqttBridgeService $mqttBridgeService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $config = config('services.waterbase_mqtt');

        if (empty($config['host'])) {
            $this->error('WATERBASE_MQTT_HOST is not configured.');

            return self::FAILURE;
        }

        $this->info('Connecting to MQTT broker...');
        $this->line('Discovery topic: ' . $this->mqttBridgeService->discoveryTopicFilter());
        $this->line('Telemetry topic: ' . $this->mqttBridgeService->telemetryTopicFilter());

        $this->mqttBridgeService->run();

        return self::SUCCESS;
    }
}