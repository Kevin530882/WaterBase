<?php

namespace Tests\Unit;

use App\Models\DeviceTelemetry;
use App\Services\WbsiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WbsiServiceTest extends TestCase
{
    use RefreshDatabase;

    private WbsiService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new WbsiService();
    }

    public function test_normal_freshwater_readings_produce_low_sensor_score(): void
    {
        $score = $this->service->calculateSensorScore($this->telemetry([
            'temperature_celsius' => 28.0,
            'ph' => 7.2,
            'turbidity_ntu' => 3.0,
            'tds_mg_l' => 180.0,
        ]));

        $this->assertLessThan(25, $score['sensor_score']);
        $this->assertSame('Low', $score['severity_label']);
    }

    public function test_high_turbidity_increases_sensor_score(): void
    {
        $score = $this->service->calculateSensorScore($this->telemetry([
            'temperature_celsius' => 28.0,
            'ph' => 7.2,
            'turbidity_ntu' => 25.0,
            'tds_mg_l' => 180.0,
        ]));

        $this->assertGreaterThan(40, $score['sensor_score']);
    }

    public function test_bad_ph_increases_sensor_score(): void
    {
        $score = $this->service->calculateSensorScore($this->telemetry([
            'temperature_celsius' => 28.0,
            'ph' => 4.5,
            'turbidity_ntu' => 3.0,
            'tds_mg_l' => 180.0,
        ]));

        $this->assertGreaterThan(0, $score['components']['ph']);
        $this->assertGreaterThan(10, $score['sensor_score']);
    }

    public function test_high_tds_increases_sensor_score(): void
    {
        $score = $this->service->calculateSensorScore($this->telemetry([
            'temperature_celsius' => 28.0,
            'ph' => 7.2,
            'turbidity_ntu' => 3.0,
            'tds_mg_l' => 1200.0,
        ]));

        $this->assertGreaterThan(0, $score['components']['tds']);
    }

    public function test_master_wbsi_uses_sensor_and_report_weights(): void
    {
        $this->assertSame(44.0, $this->service->calculateMasterScore(60.0, 20.0));
    }

    private function telemetry(array $attributes): DeviceTelemetry
    {
        return new DeviceTelemetry(array_merge([
            'device_id' => 1,
            'recorded_at' => now(),
        ], $attributes));
    }
}
