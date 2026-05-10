<?php

namespace Tests\Feature;

use App\Jobs\FanOutUserNotificationJob;
use App\Models\Event;
use App\Models\Report;
use App\Models\ReportGroup;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventReportAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancelling_event_releases_linked_reports_and_group(): void
    {
        Queue::fake([FanOutUserNotificationJob::class]);

        $creator = $this->makeUser('ngo');
        $reporter = $this->makeUser('volunteer');

        $group = ReportGroup::create([
            'center_latitude' => 14.61000000,
            'center_longitude' => 121.00000000,
            'radius_meters' => 50,
            'first_report_at' => now()->subDay(),
            'last_report_at' => now(),
            'is_active' => false,
            'report_count' => 4,
        ]);

        $event = $this->makeEvent($creator, [
            'status' => 'active',
            'report_group_id' => $group->id,
        ]);

        $group->update(['cleanup_event_id' => $event->id]);

        $verifiedReport = $this->makeReport($reporter, [
            'status' => 'verified',
            'report_group_id' => $group->id,
            'event_id' => $event->id,
        ]);

        $resolvedReport = $this->makeReport($reporter, [
            'status' => 'resolved',
            'report_group_id' => $group->id,
            'event_id' => $event->id,
        ]);

        $pendingReport = $this->makeReport($reporter, [
            'status' => 'pending',
            'report_group_id' => $group->id,
            'event_id' => $event->id,
        ]);

        $declinedReport = $this->makeReport($reporter, [
            'status' => 'declined',
            'report_group_id' => $group->id,
            'event_id' => $event->id,
        ]);

        Sanctum::actingAs($creator);

        $this->postJson('/api/events/' . $event->id . '/cancel')
            ->assertOk()
            ->assertJsonPath('success', 'Event cancelled successfully');

        $event->refresh();
        $group->refresh();
        $verifiedReport->refresh();
        $resolvedReport->refresh();
        $pendingReport->refresh();
        $declinedReport->refresh();

        $this->assertSame('cancelled', $event->status);
        $this->assertNull($group->cleanup_event_id);
        $this->assertTrue((bool) $group->is_active);

        $this->assertSame('verified', $verifiedReport->status);
        $this->assertSame('verified', $resolvedReport->status);
        $this->assertSame('pending', $pendingReport->status);
        $this->assertSame('declined', $declinedReport->status);

        $this->assertNull($verifiedReport->event_id);
        $this->assertNull($resolvedReport->event_id);
        $this->assertNull($pendingReport->event_id);
        $this->assertNull($declinedReport->event_id);
    }

    public function test_completing_event_keeps_linked_reports_pending_cleanup_evidence(): void
    {
        Queue::fake([FanOutUserNotificationJob::class]);

        $creator = $this->makeUser('ngo');
        $reporter = $this->makeUser('volunteer');
        $event = $this->makeEvent($creator, ['status' => 'active']);

        $verifiedReport = $this->makeReport($reporter, [
            'status' => 'verified',
            'event_id' => $event->id,
        ]);

        $pendingReport = $this->makeReport($reporter, [
            'status' => 'pending',
            'event_id' => $event->id,
        ]);

        Sanctum::actingAs($creator);

        $this->postJson('/api/events/' . $event->id . '/complete')
            ->assertOk()
            ->assertJsonPath('success', 'Event completed successfully')
            ->assertJsonPath('resolved_reports', 0)
            ->assertJsonPath('linked_reports_pending_verification', 2);

        $event->refresh();
        $verifiedReport->refresh();
        $pendingReport->refresh();

        $this->assertSame('completed', $event->status);
        $this->assertSame('pending', $event->cleanup_verification_status);
        $this->assertSame('verified', $verifiedReport->status);
        $this->assertSame('pending', $pendingReport->status);
        $this->assertSame($event->id, $verifiedReport->event_id);
        $this->assertSame($event->id, $pendingReport->event_id);
    }

    public function test_checked_in_volunteer_can_submit_approved_cleanup_evidence(): void
    {
        Queue::fake([FanOutUserNotificationJob::class]);
        Storage::fake('public');

        $creator = $this->makeUser('ngo');
        $volunteer = $this->makeUser('volunteer');
        $event = $this->makeEvent($creator, [
            'status' => 'completed',
            'cleanup_verification_status' => 'pending',
        ]);

        $report = $this->makeReport($volunteer, [
            'status' => 'verified',
            'event_id' => $event->id,
        ]);

        $event->attendees()->attach($volunteer->id, [
            'joined_at' => now(),
            'is_present' => true,
            'qr_scanned_at' => now(),
        ]);

        Sanctum::actingAs($volunteer);

        $this->post('/api/events/' . $event->id . '/cleanup-evidence', [
            'image' => UploadedFile::fake()->image('after-cleanup.jpg'),
            'test_ai_severity' => 'low',
            'test_pollution_percentage' => 3,
        ])->assertCreated()
            ->assertJsonPath('result', 'approved')
            ->assertJsonPath('cleanup_verification_status', 'approved');

        $event->refresh();
        $report->refresh();

        $this->assertSame('approved', $event->cleanup_verification_status);
        $this->assertSame('resolved', $report->status);
        $this->assertSame($event->id, $report->event_id);
        $this->assertDatabaseHas('event_cleanup_evidences', [
            'event_id' => $event->id,
            'submitted_by' => $volunteer->id,
            'result' => 'approved',
        ]);
    }

    public function test_joined_but_not_checked_in_volunteer_cannot_submit_cleanup_evidence(): void
    {
        Storage::fake('public');

        $creator = $this->makeUser('ngo');
        $volunteer = $this->makeUser('volunteer');
        $event = $this->makeEvent($creator, [
            'status' => 'completed',
            'cleanup_verification_status' => 'pending',
        ]);

        $event->attendees()->attach($volunteer->id, [
            'joined_at' => now(),
            'is_present' => false,
            'qr_scanned_at' => null,
        ]);

        Sanctum::actingAs($volunteer);

        $this->post('/api/events/' . $event->id . '/cleanup-evidence', [
            'image' => UploadedFile::fake()->image('after-cleanup.jpg'),
            'test_ai_severity' => 'low',
            'test_pollution_percentage' => 3,
        ])->assertForbidden();

        $this->assertDatabaseCount('event_cleanup_evidences', 0);
    }

    public function test_failed_cleanup_evidence_releases_reports_back_to_eligible_pool(): void
    {
        Queue::fake([FanOutUserNotificationJob::class]);
        Storage::fake('public');

        $creator = $this->makeUser('ngo');
        $volunteer = $this->makeUser('volunteer');
        $group = ReportGroup::create([
            'center_latitude' => 14.61000000,
            'center_longitude' => 121.00000000,
            'radius_meters' => 50,
            'first_report_at' => now()->subDay(),
            'last_report_at' => now(),
            'cleanup_event_id' => null,
            'is_active' => false,
            'report_count' => 1,
        ]);
        $event = $this->makeEvent($creator, [
            'status' => 'completed',
            'report_group_id' => $group->id,
            'cleanup_verification_status' => 'pending',
        ]);
        $group->update(['cleanup_event_id' => $event->id]);

        $report = $this->makeReport($volunteer, [
            'status' => 'verified',
            'report_group_id' => $group->id,
            'event_id' => $event->id,
        ]);

        $event->attendees()->attach($volunteer->id, [
            'joined_at' => now(),
            'is_present' => true,
            'qr_scanned_at' => now(),
        ]);

        Sanctum::actingAs($volunteer);

        $this->post('/api/events/' . $event->id . '/cleanup-evidence', [
            'image' => UploadedFile::fake()->image('after-cleanup.jpg'),
            'test_ai_severity' => 'high',
            'test_pollution_percentage' => 65,
        ])->assertCreated()
            ->assertJsonPath('result', 'failed')
            ->assertJsonPath('cleanup_verification_status', 'failed');

        $event->refresh();
        $group->refresh();
        $report->refresh();

        $this->assertSame('failed', $event->cleanup_verification_status);
        $this->assertNull($group->cleanup_event_id);
        $this->assertTrue((bool) $group->is_active);
        $this->assertSame('verified', $report->status);
        $this->assertNull($report->event_id);
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
            'organization' => $role === 'ngo' ? 'Water NGO' : null,
            'areaOfResponsibility' => 'Metro Manila',
        ]);
    }

    private function makeEvent(User $creator, array $overrides = []): Event
    {
        return Event::create(array_merge([
            'title' => 'River cleanup',
            'address' => 'Riverside',
            'latitude' => 14.61000000,
            'longitude' => 121.00000000,
            'date' => now()->toDateString(),
            'time' => '08:00',
            'duration' => 2.5,
            'description' => 'Community river cleanup event.',
            'maxVolunteers' => 100,
            'points' => 50,
            'badge' => 'River Guardian',
            'status' => 'recruiting',
            'user_id' => $creator->id,
        ], $overrides));
    }

    private function makeReport(User $reporter, array $overrides = []): Report
    {
        return Report::create(array_merge([
            'title' => 'Drain blocked',
            'content' => 'Drain blockage causing overflow.',
            'address' => 'Riverside',
            'latitude' => 14.61000000,
            'longitude' => 121.00000000,
            'pollutionType' => 'solid_waste',
            'status' => 'verified',
            'image' => '/storage/uploads/report.jpg',
            'ai_annotated_image' => '/storage/uploads/report_annotated.jpg',
            'severityByUser' => 'high',
            'severityByAI' => 'medium',
            'ai_confidence' => 87.5,
            'severityPercentage' => 71.2,
            'ai_verified' => true,
            'user_id' => $reporter->id,
        ], $overrides));
    }
}
