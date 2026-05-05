<?php

namespace App\Services;

use App\Models\Device;
use Illuminate\Support\Facades\Log;
use JsonException;
use PhpMqtt\Client\ConnectionSettings;
use PhpMqtt\Client\MqttClient;
use PhpMqtt\Client\Repositories\MemoryRepository;
use Psr\Log\NullLogger;

class MqttBridgeService
{
    public function __construct(
        protected DeviceRegistryService $deviceRegistryService,
        protected DeviceAnomalyService $deviceAnomalyService,
    )
    {
    }

    public function createClient(?string $clientId = null): MqttClient
    {
        $config = config('services.waterbase_mqtt');

        return new MqttClient(
            $config['host'],
            (int) $config['port'],
            $clientId ?? $config['client_id'],
            MqttClient::MQTT_3_1_1,
            new MemoryRepository(),
            new NullLogger()
        );
    }

    public function createConnectionSettings(): ConnectionSettings
    {
        $config = config('services.waterbase_mqtt');

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
            ->setTlsSelfSignedAllowed(true)
            ->setTlsCertificateAuthorityFile(null)
            ->setTlsCertificateAuthorityPath(null)
            ->setTlsClientCertificateFile(null)
            ->setTlsClientCertificateKeyFile(null)
            ->setTlsClientCertificateKeyPassphrase(null)
            ->setTlsAlpn(null);

        return $settings;
    }

    public function discoveryTopicFilter(): string
    {
        return rtrim((string) config('services.waterbase_mqtt.topic_prefix', 'waterbase/devices'), '/') . '/+/discovery';
    }

    public function telemetryTopicFilter(): string
    {
        return rtrim((string) config('services.waterbase_mqtt.topic_prefix', 'waterbase/devices'), '/') . '/+/telemetry';
    }

    public function commandTopic(string $stationId): string
    {
        return rtrim((string) config('services.waterbase_mqtt.topic_prefix', 'waterbase/devices'), '/') . '/' . $stationId . '/commands';
    }

    public function registerSubscriptions(MqttClient $client): void
    {
        $client->subscribe($this->discoveryTopicFilter(), function (string $topic, string $message) {
            $this->handleDiscoveryMessage($topic, $message);
        }, 0);

        $client->subscribe($this->telemetryTopicFilter(), function (string $topic, string $message) {
            $this->handleTelemetryMessage($topic, $message);
        }, 0);
    }

    public function handleDiscoveryMessage(string $topic, string $message): void
    {
        $payload = $this->decodePayload($message, 'discovery');

        if ($payload === null) {
            return;
        }

        $macAddress = $payload['mac_address'] ?? $this->extractTopicSegment($topic, 2);

        if (!is_string($macAddress) || $macAddress === '') {
            Log::warning('MQTT discovery payload missing mac_address', [
                'topic' => $topic,
                'payload' => $payload,
            ]);

            return;
        }

        $payload['mac_address'] = $macAddress;

        $this->deviceRegistryService->registerDiscovery($payload);
    }

    public function handleTelemetryMessage(string $topic, string $message): void
    {
        $payload = $this->decodePayload($message, 'telemetry');

        if ($payload === null) {
            return;
        }

        $stationId = $payload['station_id'] ?? $this->extractTopicSegment($topic, 2);

        if (!is_string($stationId) || $stationId === '') {
            Log::warning('MQTT telemetry payload missing station_id', [
                'topic' => $topic,
                'payload' => $payload,
            ]);

            return;
        }

        $device = Device::where('station_id', $stationId)->first();

        if (!$device instanceof Device) {
            Log::warning('MQTT telemetry received for unknown station', [
                'topic' => $topic,
                'station_id' => $stationId,
                'payload' => $payload,
            ]);

            // The device may have been deleted while offline. Tell it to clear
            // its persisted station_id so it returns to discovery mode.
            try {
                $this->publishCommand($stationId, ['command_type' => 'unpair']);
            } catch (\Throwable $e) {
                Log::warning('Failed to publish unpair command to unknown station', [
                    'station_id' => $stationId,
                    'error' => $e->getMessage(),
                ]);
            }

            return;
        }

        $payload['station_id'] = $stationId;

        $this->deviceRegistryService->recordTelemetry($device, $payload);

        $this->deviceAnomalyService->checkLatestTelemetry($device);
    }

    public function publishCommand(string $stationId, array $payload): void
    {
        $uniqueClientId = config('services.waterbase_mqtt.client_id') . '-cmd-' . $stationId . '-' . uniqid();
        $client = $this->createClient($uniqueClientId);
        $client->connect($this->createConnectionSettings(), true);

        try {
            $commandPayload = array_merge([
                'station_id' => $stationId,
                'issued_at' => now()->toISOString(),
            ], $payload);

            $client->publish(
                $this->commandTopic($stationId),
                json_encode($commandPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                0,
                false
            );
        } finally {
            if ($client->isConnected()) {
                $client->disconnect();
            }
        }
    }

    public function run(): void
    {
        while (true) {
            $client = null;

            try {
                $client = $this->createClient();
                $client->connect($this->createConnectionSettings(), true);
                $this->registerSubscriptions($client);

                Log::info('MQTT bridge connected', [
                    'host' => config('services.waterbase_mqtt.host'),
                    'port' => config('services.waterbase_mqtt.port'),
                    'discovery_topic' => $this->discoveryTopicFilter(),
                    'telemetry_topic' => $this->telemetryTopicFilter(),
                ]);

                $client->loop(true);
            } catch (\PhpMqtt\Client\Exceptions\DataTransferException|\PhpMqtt\Client\Exceptions\ConnectionException $e) {
                Log::warning('MQTT bridge connection lost, reconnecting...', [
                    'error' => $e->getMessage(),
                ]);
            } catch (\Throwable $e) {
                Log::error('MQTT bridge unexpected error, reconnecting...', [
                    'error' => $e->getMessage(),
                ]);
            } finally {
                if ($client !== null && $client->isConnected()) {
                    try {
                        $client->disconnect();
                    } catch (\Throwable) {
                        // ignore disconnect errors
                    }
                }
            }

            sleep(5);
        }
    }

    protected function decodePayload(string $message, string $context): ?array
    {
        try {
            $decoded = json_decode($message, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            Log::warning('MQTT payload is not valid JSON', [
                'context' => $context,
                'error' => $exception->getMessage(),
                'message' => $message,
            ]);

            return null;
        }

        if (!is_array($decoded)) {
            Log::warning('MQTT payload decoded to a non-array value', [
                'context' => $context,
                'message' => $message,
            ]);

            return null;
        }

        return $decoded;
    }

    protected function extractTopicSegment(string $topic, int $segmentIndex): ?string
    {
        $segments = array_values(array_filter(explode('/', trim($topic, '/')), static fn ($segment) => $segment !== ''));

        return $segments[$segmentIndex] ?? null;
    }
}