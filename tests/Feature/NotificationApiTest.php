<?php

namespace Tests\Feature;

use App\Jobs\FanOutUserNotificationJob;
use App\Models\Event;
use App\Models\Report;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_and_update_notification_read_state(): void
    {
        $user = $this->makeUser('volunteer');
        Sanctum::actingAs($user);

        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'report_status_changed',
            'channel' => 'in_app',
            'severity' => 'info',
            'title' => 'Report status updated',
            'message' => 'Your report is now verified.',
            'metadata' => ['target_id' => '1'],
            'idempotency_key' => 'notif-1',
        ]);

        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'event_created',
            'channel' => 'in_app',
            'severity' => 'info',
            'title' => 'Event created',
            'message' => 'A new event is available.',
            'metadata' => ['target_id' => '2'],
            'idempotency_key' => 'notif-2',
            'read_at' => now(),
        ]);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJson(['unread_count' => 1]);

        $unread = UserNotification::where('user_id', $user->id)->whereNull('read_at')->firstOrFail();

        $this->patchJson('/api/notifications/' . $unread->id . '/read-state', ['read' => true])
            ->assertOk();

        $this->patchJson('/api/notifications/mark-all-read')
            ->assertOk()
            ->assertJsonStructure(['message', 'updated']);

        $this->getJson('/api/notifications?read=1')
            ->assertOk()
            ->assertJsonPath('total', 2);
    }

    public function test_report_status_update_enqueues_notification_fanout_job(): void
    {
        Queue::fake();

        $reporter = $this->makeUser('volunteer');
        $actor = $this->makeUser('admin');

        $report = Report::create([
            'title' => 'Drain blocked',
            'content' => 'Drain blockage causing overflow.',
            'address' => 'Main St',
            'latitude' => 14.60000000,
            'longitude' => 120.98000000,
            'pollutionType' => 'solid_waste',
            'status' => 'pending',
            'image' => '/storage/uploads/report.jpg',
            'ai_annotated_image' => '/storage/uploads/report_annotated.jpg',
            'severityByUser' => 'high',
            'severityByAI' => 'medium',
            'ai_confidence' => 87.5,
            'severityPercentage' => 71.2,
            'ai_verified' => true,
            'user_id' => $reporter->id,
        ]);

        Sanctum::actingAs($actor);

        $this->patchJson('/api/reports/' . $report->id . '/status', [
            'status' => 'verified',
        ])->assertOk();

        Queue::assertPushed(FanOutUserNotificationJob::class, function (FanOutUserNotificationJob $job) use ($reporter) {
            return $job->type === 'report_status_changed'
                && in_array($reporter->id, $job->recipientIds, true);
        });
    }

    public function test_event_status_transition_enqueues_event_ongoing_notification(): void
    {
        Queue::fake();

        $creator = $this->makeUser('ngo');

        $event = Event::create([
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
        ]);

        Sanctum::actingAs($creator);

        $this->putJson('/api/events/' . $event->id, [
            'status' => 'active',
        ])->assertOk();

        Queue::assertPushed(FanOutUserNotificationJob::class, function (FanOutUserNotificationJob $job) use ($creator) {
            return $job->type === 'event_ongoing'
                && in_array($creator->id, $job->recipientIds, true);
        });
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
}
