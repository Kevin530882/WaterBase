<?php

$mysqlbinlog = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqlbinlog.exe';
$logs = [
    'HP-ENVY-X360-bin.000067',
    'HP-ENVY-X360-bin.000068',
    'HP-ENVY-X360-bin.000069',
    'HP-ENVY-X360-bin.000070',
    'HP-ENVY-X360-bin.000071',
    'HP-ENVY-X360-bin.000072',
    'HP-ENVY-X360-bin.000073',
    'HP-ENVY-X360-bin.000074',
    'HP-ENVY-X360-bin.000075',
    'HP-ENVY-X360-bin.000076',
];

$deviceColumns14 = [
    'id', 'mac_address', 'station_id', 'name', 'status', 'paired_by_user_id',
    'paired_at', 'discovery_last_seen_at', 'last_seen_at', 'firmware_version',
    'hardware_revision', 'raw_discovery_payload', 'created_at', 'updated_at',
];

$deviceColumns16 = [
    'id', 'mac_address', 'station_id', 'name', 'status', 'paired_by_user_id',
    'paired_at', 'discovery_last_seen_at', 'last_seen_at', 'firmware_version',
    'hardware_revision', 'raw_discovery_payload', 'latitude', 'longitude',
    'created_at', 'updated_at',
];

$telemetryColumns13 = [
    'id', 'device_id', 'recorded_at', 'reading_timestamp_ms', 'latency_ms',
    'temperature_celsius', 'ph', 'turbidity_ntu', 'tds_mg_l', 'water_level_cm',
    'raw_payload', 'created_at', 'updated_at',
];

$telemetryColumns14 = [
    'id', 'device_id', 'recorded_at', 'received_at', 'reading_timestamp_ms',
    'latency_ms', 'temperature_celsius', 'ph', 'turbidity_ntu', 'tds_mg_l',
    'water_level_cm', 'raw_payload', 'created_at', 'updated_at',
];

$devices = [];
$telemetries = [];
$current = null;

function normalizeTimestamp($value): mixed
{
    if ($value === null || $value === '') {
        return $value;
    }

    if (is_int($value) || (is_string($value) && preg_match('/^\d{10}$/', $value))) {
        return gmdate('Y-m-d H:i:s', (int) $value);
    }

    return $value;
}

function parseBinlogValue(string $raw): mixed
{
    $raw = trim($raw);

    if ($raw === 'NULL') {
        return null;
    }

    if (preg_match("/^'(.*)'$/s", $raw, $matches)) {
        return str_replace(["\\'", '\\\\'], ["'", '\\'], $matches[1]);
    }

    if (preg_match('/^-?\d+$/', $raw)) {
        return (int) $raw;
    }

    if (preg_match('/^-?\d+\.\d+$/', $raw)) {
        return (float) $raw;
    }

    return $raw;
}

function rowFromValues(array $values, string $table): array
{
    global $deviceColumns14, $deviceColumns16, $telemetryColumns13, $telemetryColumns14;

    $count = count($values);
    $columns = match ($table) {
        'devices' => $count >= 16 ? $deviceColumns16 : $deviceColumns14,
        'device_telemetries' => $count >= 14 ? $telemetryColumns14 : $telemetryColumns13,
        default => [],
    };

    $row = [];
    foreach ($columns as $index => $column) {
        $row[$column] = $values[$index + 1] ?? null;
    }

    foreach ([
        'paired_at',
        'discovery_last_seen_at',
        'last_seen_at',
        'recorded_at',
        'received_at',
        'created_at',
        'updated_at',
    ] as $timestampColumn) {
        if (array_key_exists($timestampColumn, $row)) {
            $row[$timestampColumn] = normalizeTimestamp($row[$timestampColumn]);
        }
    }

    if ($table === 'devices') {
        $row['environment_type'] = $row['environment_type'] ?? 'freshwater';
    }

    if ($table === 'device_telemetries' && !array_key_exists('received_at', $row)) {
        $row['received_at'] = $row['created_at'] ?? $row['recorded_at'] ?? null;
    }

    return $row;
}

function applyEvent(?array $event): void
{
    global $devices, $telemetries;

    if ($event === null || !in_array($event['table'], ['devices', 'device_telemetries'], true)) {
        return;
    }

    $target = $event['table'] === 'devices' ? 'devices' : 'telemetries';

    if ($event['action'] === 'insert') {
        $row = rowFromValues($event['set'], $event['table']);
        if (!isset($row['id'])) {
            return;
        }
        ${$target}[(int) $row['id']] = $row;
        return;
    }

    $where = rowFromValues($event['where'], $event['table']);
    $id = isset($where['id']) ? (int) $where['id'] : null;

    if ($id === null) {
        return;
    }

    if ($event['action'] === 'delete') {
        unset(${$target}[$id]);
        return;
    }

    if ($event['action'] === 'update') {
        $row = rowFromValues($event['set'], $event['table']);
        ${$target}[$id] = $row;
    }
}

foreach ($logs as $log) {
    $stop = $log === 'HP-ENVY-X360-bin.000076' ? ' --stop-position=779229' : '';
    $command = '"' . $mysqlbinlog . '" --read-from-remote-server --host=127.0.0.1 -uroot -proot --verbose' . $stop . ' ' . $log;
    $handle = popen($command, 'r');

    if (!$handle) {
        fwrite(STDERR, "Unable to read $log\n");
        exit(1);
    }

    while (($line = fgets($handle)) !== false) {
        $line = rtrim($line, "\r\n");

        if (preg_match('/^### (INSERT INTO|UPDATE|DELETE FROM) `waterbasebackend`\.`([^`]+)`/', $line, $matches)) {
            applyEvent($current);
            $current = [
                'action' => match ($matches[1]) {
                    'INSERT INTO' => 'insert',
                    'UPDATE' => 'update',
                    'DELETE FROM' => 'delete',
                },
                'table' => $matches[2],
                'where' => [],
                'set' => [],
                'section' => null,
            ];
            continue;
        }

        if ($current === null) {
            continue;
        }

        if ($line === '### WHERE') {
            $current['section'] = 'where';
            continue;
        }

        if ($line === '### SET') {
            $current['section'] = 'set';
            continue;
        }

        if (preg_match('/^###\s+@(\d+)=(.*)$/s', $line, $matches) && $current['section'] !== null) {
            $current[$current['section']][(int) $matches[1]] = parseBinlogValue($matches[2]);
            continue;
        }

        if (str_starts_with($line, 'COMMIT')) {
            applyEvent($current);
            $current = null;
        }
    }

    applyEvent($current);
    $current = null;
    pclose($handle);
}

ksort($devices);
ksort($telemetries);

$existingDeviceIds = array_fill_keys(array_keys($devices), true);
$telemetries = array_filter(
    $telemetries,
    fn (array $row): bool => isset($existingDeviceIds[(int) $row['device_id']])
);

$pdo = new PDO('mysql:host=127.0.0.1;dbname=waterbasebackend;charset=utf8mb4', 'root', 'root', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
$pdo->exec('TRUNCATE TABLE device_telemetries');
$pdo->exec('TRUNCATE TABLE devices');
$pdo->exec('SET FOREIGN_KEY_CHECKS=1');

$deviceInsert = $pdo->prepare(
    'INSERT INTO devices (id, mac_address, station_id, name, status, paired_by_user_id, paired_at, discovery_last_seen_at, last_seen_at, firmware_version, hardware_revision, raw_discovery_payload, latitude, longitude, environment_type, created_at, updated_at)
     VALUES (:id, :mac_address, :station_id, :name, :status, :paired_by_user_id, :paired_at, :discovery_last_seen_at, :last_seen_at, :firmware_version, :hardware_revision, :raw_discovery_payload, :latitude, :longitude, :environment_type, :created_at, :updated_at)'
);

foreach ($devices as $row) {
    $deviceInsert->execute([
        'id' => $row['id'],
        'mac_address' => $row['mac_address'],
        'station_id' => $row['station_id'] ?? null,
        'name' => $row['name'] ?? null,
        'status' => $row['status'] ?? 'awaiting_pair',
        'paired_by_user_id' => $row['paired_by_user_id'] ?? null,
        'paired_at' => $row['paired_at'] ?? null,
        'discovery_last_seen_at' => $row['discovery_last_seen_at'] ?? null,
        'last_seen_at' => $row['last_seen_at'] ?? null,
        'firmware_version' => $row['firmware_version'] ?? null,
        'hardware_revision' => $row['hardware_revision'] ?? null,
        'raw_discovery_payload' => $row['raw_discovery_payload'] ?? null,
        'latitude' => $row['latitude'] ?? null,
        'longitude' => $row['longitude'] ?? null,
        'environment_type' => $row['environment_type'] ?? 'freshwater',
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ]);
}

$telemetryInsert = $pdo->prepare(
    'INSERT INTO device_telemetries (id, device_id, recorded_at, received_at, reading_timestamp_ms, latency_ms, temperature_celsius, ph, turbidity_ntu, tds_mg_l, water_level_cm, raw_payload, created_at, updated_at)
     VALUES (:id, :device_id, :recorded_at, :received_at, :reading_timestamp_ms, :latency_ms, :temperature_celsius, :ph, :turbidity_ntu, :tds_mg_l, :water_level_cm, :raw_payload, :created_at, :updated_at)'
);

foreach ($telemetries as $row) {
    $telemetryInsert->execute([
        'id' => $row['id'],
        'device_id' => $row['device_id'],
        'recorded_at' => $row['recorded_at'],
        'received_at' => $row['received_at'] ?? null,
        'reading_timestamp_ms' => $row['reading_timestamp_ms'] ?? null,
        'latency_ms' => $row['latency_ms'] ?? null,
        'temperature_celsius' => $row['temperature_celsius'] ?? null,
        'ph' => $row['ph'] ?? null,
        'turbidity_ntu' => $row['turbidity_ntu'] ?? null,
        'tds_mg_l' => $row['tds_mg_l'] ?? null,
        'water_level_cm' => $row['water_level_cm'] ?? null,
        'raw_payload' => $row['raw_payload'] ?? null,
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ]);
}

$pdo->exec('SET FOREIGN_KEY_CHECKS=1');

echo 'Recovered devices: ' . count($devices) . PHP_EOL;
echo 'Recovered telemetry rows: ' . count($telemetries) . PHP_EOL;
