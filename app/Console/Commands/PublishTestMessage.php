<?php

namespace App\Console\Commands;

use App\Services\MqttBridgeService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use PhpMqtt\Client\ConnectionSettings;
use PhpMqtt\Client\MqttClient;
use PhpMqtt\Client\Repositories\MemoryRepository;
use Psr\Log\NullLogger;

class PublishTestMessage extends Command
{
    protected $signature = 'mqtt:publish-test {topic} {payload}';

    protected $description = 'Publish a test message to the HiveMQ Cloud broker for development/testing.';

    public function handle(): int
    {
        $topic = $this->argument('topic');
        $payload = $this->argument('payload');

        $this->info('Publishing test message...');
        $this->line("Topic: $topic");
        $this->line("Payload: $payload");

        try {
            $config = config('services.waterbase_mqtt');

            $client = new MqttClient(
                $config['host'],
                (int) $config['port'],
                'test-publisher-' . time(),
                MqttClient::MQTT_3_1_1,
                new MemoryRepository(),
                new NullLogger()
            );

            $settings = (new ConnectionSettings())
                ->setUsername($config['username'] ?: null)
                ->setPassword($config['password'] ?: null)
                ->setConnectTimeout((int) $config['connect_timeout'])
                ->setSocketTimeout((int) $config['socket_timeout'])
                ->setResendTimeout((int) $config['resend_timeout'])
                ->setKeepAliveInterval((int) $config['keep_alive_interval'])
                ->setReconnectAutomatically(false)
                ->setUseTls((bool) $config['use_tls'])
                ->setTlsVerifyPeer(false)
                ->setTlsVerifyPeerName(false)
                ->setTlsSelfSignedAllowed(true);

            $client->connect($settings, true);

            $client->publish(
                $topic,
                $payload,
                0,
                false
            );

            $client->loop(true, true);
            $client->disconnect();

            $this->info('✓ Message published successfully!');

            Log::info('Test message published', [
                'topic' => $topic,
                'payload' => $payload,
            ]);

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('✗ Failed to publish: ' . $e->getMessage());

            Log::error('Test message publish failed', [
                'error' => $e->getMessage(),
                'topic' => $topic,
            ]);

            return self::FAILURE;
        }
    }
}
