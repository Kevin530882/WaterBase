<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityLogPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_volunteer_reports_endpoint_only_returns_their_reports(): void
    {
        $volunteer = $this->makeUser('volunteer');
        $otherUser = $this->makeUser('volunteer');

        $ownReport = $this->makeReport($volunteer, 'Own report');
        $this->makeReport($otherUser, 'Other report');

        Sanctum::actingAs($volunteer);

        $response = $this->getJson('/api/reports')
            ->assertOk();

        $this->assertSame([$ownReport->id], collect($response->json())->pluck('id')->all());
    }

    public function test_researcher_reports_endpoint_only_returns_their_reports(): void
    {
        $researcher = $this->makeUser('researcher');
        $otherUser = $this->makeUser('volunteer');

        $ownReport = $this->makeReport($researcher, 'Researcher report');
        $this->makeReport($otherUser, 'Other report');

        Sanctum::actingAs($researcher);

        $response = $this->getJson('/api/reports')
            ->assertOk();

        $this->assertSame([$ownReport->id], collect($response->json())->pluck('id')->all());
    }

    public function test_created_events_endpoint_only_returns_events_created_by_user(): void
    {
        $organizer = $this->makeUser('ngo');
        $otherOrganizer = $this->makeUser('lgu');

        $ownEvent = $this->makeEvent($organizer, 'Own cleanup');
        $this->makeEvent($otherOrganizer, 'Other cleanup');

        Sanctum::actingAs($organizer);

        $response = $this->getJson('/api/user/created-events')
            ->assertOk();

        $this->assertSame([$ownEvent->id], collect($response->json())->pluck('id')->all());
    }

    public function test_user_events_endpoint_only_returns_joined_events(): void
    {
        $volunteer = $this->makeUser('volunteer');
        $otherVolunteer = $this->makeUser('volunteer');
        $organizer = $this->makeUser('ngo');

        $joinedEvent = $this->makeEvent($organizer, 'Joined cleanup');
        $otherEvent = $this->makeEvent($organizer, 'Other cleanup');

        $joinedEvent->attendees()->attach($volunteer->id, ['joined_at' => now()]);
        $otherEvent->attendees()->attach($otherVolunteer->id, ['joined_at' => now()]);

        Sanctum::actingAs($volunteer);

        $response = $this->getJson('/api/user/events')
            ->assertOk();

        $this->assertSame([$joinedEvent->id], collect($response->json())->pluck('id')->all());
    }

    public function test_reports_all_endpoint_still_returns_global_reports(): void
    {
        $admin = $this->makeUser('admin');
        $firstUser = $this->makeUser('volunteer');
        $secondUser = $this->makeUser('researcher');

        $firstReport = $this->makeReport($firstUser, 'First report');
        $secondReport = $this->makeReport($secondUser, 'Second report');

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/reports/all')
            ->assertOk();

        $this->assertEqualsCanonicalizing(
            [$firstReport->id, $secondReport->id],
            collect($response->json())->pluck('id')->all()
        );
    }

    private function makeUser(string $role): User
    {
        return User::create([
            'firstName' => ucfirst($role),
            'lastName' => 'Tester',
            'email' => uniqid($role . '.', true) . '@example.com',
            'password' => Hash::make('password123'),
            'phoneNumber' => '09123456789',
            'role' => $role,
        ]);
    }

    private function makeReport(User $user, string $title): Report
    {
        return Report::create([
            'title' => $title,
            'content' => 'Observed polluted water.',
            'address' => 'Pasig River, Metro Manila',
            'latitude' => '14.59950000',
            'longitude' => '121.00080000',
            'pollutionType' => 'Plastic Pollution',
            'status' => 'pending',
            'image' => '/storage/uploads/test.jpg',
            'ai_annotated_image' => '/storage/uploads/test_annotated.jpg',
            'severityByUser' => 'medium',
            'severityByAI' => 'medium',
            'ai_confidence' => '88.25',
            'severityPercentage' => '42.50',
            'ai_verified' => true,
            'user_id' => $user->id,
        ]);
    }

    private function makeEvent(User $organizer, string $title): Event
    {
        return Event::create([
            'title' => $title,
            'address' => 'Pasig River, Metro Manila',
            'latitude' => '14.59950000',
            'longitude' => '121.00080000',
            'date' => now()->addWeek()->toDateString(),
            'time' => '09:00',
            'duration' => '2.0',
            'description' => 'Cleanup drive.',
            'maxVolunteers' => 20,
            'points' => 10,
            'badge' => 'Cleanup Helper',
            'status' => 'recruiting',
            'user_id' => $organizer->id,
        ]);
    }
}
