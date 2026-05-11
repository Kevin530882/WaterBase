<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\Report;
use App\Models\ReportGroup;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\AreaWbsiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AreaWbsiApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_different_water_bodies_do_not_merge_when_nearby(): void
    {
        Sanctum::actingAs($this->makeUser());
        $this->makeReport(['water_body_name' => 'River A', 'latitude' => 10.0, 'longitude' => 123.0]);
        $this->makeReport(['water_body_name' => 'River B', 'latitude' => 10.0001, 'longitude' => 123.0001]);

        $this->getJson('/api/map/wbsi-areas')
            ->assertOk()
            ->assertJsonCount(2, 'areas')
            ->assertJsonPath('areas.0.source', 'report_only');
    }

    public function test_unnamed_reports_use_report_group_before_proximity(): void
    {
        Sanctum::actingAs($this->makeUser());
        $group = ReportGroup::create([
            'center_latitude' => 10,
            'center_longitude' => 123,
            'radius_meters' => 50,
            'first_report_at' => now(),
            'last_report_at' => now(),
        ]);

        $this->makeReport(['report_group_id' => $group->id, 'latitude' => 10.0, 'longitude' => 123.0]);
        $this->makeReport(['report_group_id' => $group->id, 'latitude' => 10.01, 'longitude' => 123.01]);

        $this->getJson('/api/map/wbsi-areas')
            ->assertOk()
            ->assertJsonCount(1, 'areas')
            ->assertJsonPath('areas.0.grouping_method', 'report_group')
            ->assertJsonPath('areas.0.report_count', 2);
    }

    public function test_combined_area_uses_configured_weights(): void
    {
        Sanctum::actingAs($this->makeUser());
        SystemSetting::create(array_merge(SystemSetting::DEFAULTS, [
            'wbsi_sensor_weight' => 0.70,
            'wbsi_report_weight' => 0.30,
            'wbsi_sensor_assignment_radius_m' => 1000,
        ]));

        $this->makeReport([
            'latitude' => 10.0,
            'longitude' => 123.0,
            'severityPercentage' => 80,
        ]);
        $device = $this->makeDevice(['latitude' => 10.0001, 'longitude' => 123.0001]);
        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => now(),
            'temperature_celsius' => 28,
            'ph' => 7.2,
            'tds_mg_l' => 180,
            'turbidity_ntu' => 25,
        ]);

        $area = app(AreaWbsiService::class)->areas()[0];

        $this->assertSame('combined', $area['source']);
        $this->assertNotNull($area['area_wbsi']);
        $this->assertEquals(
            round((0.70 * $area['sensor_score']) + (0.30 * $area['report_wbsi']), 2),
            $area['area_wbsi']
        );
        $this->assertArrayNotHasKey('wbsi_display_shrunk', $area['distribution']['config']);
    }

    public function test_sensor_without_report_area_is_sensor_only(): void
    {
        Sanctum::actingAs($this->makeUser());
        $device = $this->makeDevice(['latitude' => 10.0, 'longitude' => 123.0]);
        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => now(),
            'temperature_celsius' => 28,
            'ph' => 7.2,
            'tds_mg_l' => 180,
            'turbidity_ntu' => 3,
        ]);

        $this->getJson('/api/map/wbsi-areas')
            ->assertOk()
            ->assertJsonCount(1, 'areas')
            ->assertJsonPath('areas.0.source', 'sensor_only');
    }

    public function test_sensor_only_distribution_uses_sensor_score(): void
    {
        Sanctum::actingAs($this->makeUser());
        $device = $this->makeDevice(['latitude' => 10.0, 'longitude' => 123.0]);
        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => now(),
            'temperature_celsius' => 28,
            'ph' => 7.2,
            'tds_mg_l' => 180,
            'turbidity_ntu' => 25,
        ]);

        $area = app(AreaWbsiService::class)->areas()[0];

        $this->assertSame('sensor_only', $area['source']);
        $this->assertSame($area['sensor_score'], $area['distribution']['wbsi']);
        $this->assertSame($area['sensor_score'], $area['distribution']['config']['wbsi_display']);
        $this->assertSame('sensor', $area['distribution']['config']['source']);
        $this->assertSame(0, $area['distribution']['config']['n_reports']);
    }

    public function test_admin_settings_persist_kde_distribution_toggle(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        $payload = array_merge(SystemSetting::DEFAULTS, [
            'wbsi_kde_distribution_enabled' => true,
        ]);

        $this->putJson('/api/admin/system-settings', $payload)
            ->assertOk()
            ->assertJsonPath('wbsi_kde_distribution_enabled', true);

        $this->assertTrue((bool) SystemSetting::current()->wbsi_kde_distribution_enabled);
    }

    public function test_kde_distribution_toggle_adds_small_sample_shrinkage(): void
    {
        Sanctum::actingAs($this->makeUser());
        SystemSetting::create(array_merge(SystemSetting::DEFAULTS, [
            'wbsi_kde_distribution_enabled' => true,
        ]));
        $this->makeReport([
            'latitude' => 10.0,
            'longitude' => 123.0,
            'severityPercentage' => 80,
        ]);

        $area = app(AreaWbsiService::class)->areas()[0];
        $config = $area['distribution']['config'];

        $this->assertArrayHasKey('wbsi_display_shrunk', $config);
        $this->assertArrayHasKey('shrinkage_factor', $config);
        $this->assertLessThan($config['wbsi_display'], $config['wbsi_display_shrunk']);
        $this->assertSame(1, $config['n_reports']);
    }

    public function test_admin_settings_reject_invalid_weights(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        $payload = array_merge(SystemSetting::DEFAULTS, [
            'wbsi_sensor_weight' => 0.80,
            'wbsi_report_weight' => 0.40,
        ]);

        $this->putJson('/api/admin/system-settings', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['wbsi_sensor_weight', 'wbsi_report_weight']);
    }

    private function makeReport(array $attributes = []): Report
    {
        return Report::create(array_merge([
            'title' => 'Pollution Report',
            'content' => 'Reported pollution',
            'address' => 'Cebu City',
            'latitude' => 10.0,
            'longitude' => 123.0,
            'pollutionType' => 'Trash',
            'severityByUser' => 'critical',
            'severityByAI' => 'critical',
            'ai_confidence' => 90,
            'severityPercentage' => 80,
            'ai_verified' => true,
            'image' => 'reports/test.jpg',
            'ai_annotated_image' => 'reports/test-annotated.jpg',
            'user_id' => $this->makeUser()->id,
            'status' => 'verified',
        ], $attributes));
    }

    private function makeDevice(array $attributes = []): Device
    {
        return Device::create(array_merge([
            'mac_address' => uniqid('AA:BB:CC:', true),
            'station_id' => uniqid('station-', true),
            'name' => 'Test Sensor',
            'status' => 'paired',
            'paired_at' => now(),
            'latitude' => 10.0,
            'longitude' => 123.0,
            'environment_type' => 'freshwater',
        ], $attributes));
    }

    private function makeUser(string $role = 'researcher'): User
    {
        return User::create([
            'firstName' => ucfirst($role),
            'lastName' => 'Tester',
            'email' => uniqid($role . '.', true) . '@example.com',
            'password' => Hash::make('password123'),
            'phoneNumber' => '09123456789',
            'role' => $role,
            'areaOfResponsibility' => 'Cebu',
        ]);
    }
}
