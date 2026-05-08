<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceTelemetry;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResearchGeotemporalApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_stations_endpoint_returns_scores_for_latest_telemetry(): void
    {
        Sanctum::actingAs($this->makeUser('researcher'));
        $device = $this->makeDevice();

        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => now(),
            'temperature_celsius' => 28.0,
            'ph' => 7.1,
            'tds_mg_l' => 180.0,
            'turbidity_ntu' => 12.0,
        ]);

        $this->getJson('/api/research/geotemporal/stations')
            ->assertOk()
            ->assertJsonPath('0.station_id', 'station-research-01')
            ->assertJsonPath('0.environment_type', 'freshwater')
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'latest_telemetry',
                    'scores' => ['sensor_score', 'severity_label', 'master_wbsi'],
                ],
            ]);
    }

    public function test_trends_endpoint_respects_parameter_and_date_range(): void
    {
        Sanctum::actingAs($this->makeUser('researcher'));
        $device = $this->makeDevice();

        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => '2026-05-01 08:00:00',
            'temperature_celsius' => 28.0,
            'ph' => 7.1,
            'tds_mg_l' => 180.0,
            'turbidity_ntu' => 8.0,
        ]);
        DeviceTelemetry::create([
            'device_id' => $device->id,
            'recorded_at' => '2026-05-02 08:00:00',
            'temperature_celsius' => 29.0,
            'ph' => 7.4,
            'tds_mg_l' => 190.0,
            'turbidity_ntu' => 10.0,
        ]);

        $this->getJson('/api/research/geotemporal/trends?parameter=turbidity&aggregate=max&from=2026-05-01&to=2026-05-01')
            ->assertOk()
            ->assertJsonPath('parameter', 'turbidity')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.value', 8);
    }

    public function test_cleanups_endpoint_returns_organization_rankings(): void
    {
        $researcher = $this->makeUser('researcher');
        Sanctum::actingAs($researcher);
        $ngo = $this->makeUser('ngo', 'Blue Water Org');

        $event = Event::create([
            'title' => 'River Cleanup',
            'address' => 'Pasig River',
            'latitude' => 14.58,
            'longitude' => 121.0,
            'date' => '2026-05-08',
            'time' => '08:00:00',
            'duration' => 3,
            'description' => 'Cleanup',
            'maxVolunteers' => 20,
            'points' => 10,
            'badge' => 'Cleanup',
            'status' => 'active',
            'user_id' => $ngo->id,
        ]);

        $event->attendees()->attach($researcher->id, ['joined_at' => now()]);

        $this->getJson('/api/research/geotemporal/cleanups?from=2026-05-01&to=2026-05-31')
            ->assertOk()
            ->assertJsonPath('rankings.0.organization', 'Blue Water Org')
            ->assertJsonPath('rankings.0.events_count', 1)
            ->assertJsonPath('rankings.0.volunteers_count', 1);
    }

    private function makeDevice(): Device
    {
        return Device::create([
            'mac_address' => uniqid('AA:BB:CC:', true),
            'station_id' => 'station-research-01',
            'name' => 'Research Station',
            'status' => 'paired',
            'paired_at' => now(),
            'latitude' => 14.58,
            'longitude' => 121.0,
            'environment_type' => 'freshwater',
        ]);
    }

    private function makeUser(string $role, ?string $organization = null): User
    {
        return User::create([
            'firstName' => ucfirst($role),
            'lastName' => 'Tester',
            'email' => uniqid($role . '.', true) . '@example.com',
            'password' => Hash::make('password123'),
            'phoneNumber' => '09123456789',
            'role' => $role,
            'organization' => $organization,
            'areaOfResponsibility' => 'Metro Manila',
            'push_notifications_enabled' => true,
            'push_pref_report_updates' => true,
            'push_pref_event_reminders' => true,
            'push_pref_achievements' => false,
            'push_quiet_hours_enabled' => false,
        ]);
    }
}
