<?php

namespace Tests\Feature;

use App\Jobs\FanOutUserNotificationJob;
use App\Models\Event;
use App\Models\Report;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_and_update_notification_preferences(): void
    {
        $user = $this->makeUser('volunteer');
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications/preferences')
            ->assertOk()
            ->assertJsonPath('push_notifications_enabled', true)
            ->assertJsonPath('report_updates', true)
            ->assertJsonPath('event_reminders', true)
            ->assertJsonPath('achievements', false)
            ->assertJsonPath('quiet_hours_enabled', false);

        $this->patchJson('/api/notifications/preferences', [
            'report_updates' => false,
            'event_reminders' => false,
            'achievements' => true,
            'quiet_hours_enabled' => true,
            'quiet_hours_start' => '22:00',
            'quiet_hours_end' => '07:00',
        ])->assertOk()
            ->assertJsonPath('preferences.report_updates', false)
            ->assertJsonPath('preferences.event_reminders', false)
            ->assertJsonPath('preferences.achievements', true)
            ->assertJsonPath('preferences.quiet_hours_enabled', true);

        $user->refresh();
        $this->assertFalse((bool) $user->push_pref_report_updates);
        $this->assertFalse((bool) $user->push_pref_event_reminders);
        $this->assertTrue((bool) $user->push_pref_achievements);
        $this->assertTrue((bool) $user->push_quiet_hours_enabled);
        $this->assertSame('22:00', $user->push_quiet_hours_start);
        $this->assertSame('07:00', $user->push_quiet_hours_end);
    }

    public function test_user_can_register_and_revoke_push_token(): void
    {
        $user = $this->makeUser('volunteer');
        Sanctum::actingAs($user);

        $token = 'ExponentPushToken[test-push-token-1]';

        $this->postJson('/api/user/push-token', [
            'token' => $token,
            'platform' => 'android',
            'app_version' => '1.0.0',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Push token registered');

        $user->refresh();
        $this->assertSame($token, $user->expo_push_token);
        $this->assertSame('android', $user->push_token_platform);
        $this->assertSame('1.0.0', $user->push_token_app_version);
        $this->assertNotNull($user->push_token_updated_at);

        $this->deleteJson('/api/user/push-token', [
            'token' => $token,
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Push token revoked');

        $user->refresh();
        $this->assertNull($user->expo_push_token);
        $this->assertNull($user->push_token_platform);
        $this->assertNull($user->push_token_app_version);
        $this->assertNotNull($user->push_token_updated_at);
    }

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

    public function test_volunteer_can_leave_joined_event(): void
    {
        $creator = $this->makeUser('ngo');
        $volunteer = $this->makeUser('volunteer');

        $event = Event::create([
            'title' => 'Creek cleanup',
            'address' => 'Creekside',
            'latitude' => 14.62000000,
            'longitude' => 121.02000000,
            'date' => now()->toDateString(),
            'time' => '09:00',
            'duration' => 2.0,
            'description' => 'Cleanup drive',
            'maxVolunteers' => 20,
            'points' => 20,
            'badge' => 'Cleanup Starter',
            'status' => 'recruiting',
            'user_id' => $creator->id,
        ]);

        $event->attendees()->attach($volunteer->id, ['joined_at' => now()]);

        Sanctum::actingAs($volunteer);

        $this->postJson('/api/events/' . $event->id . '/leave', [])
            ->assertOk()
            ->assertJsonPath('message', 'Successfully left the event');

        $this->assertFalse(
            $event->attendees()->where('users.id', $volunteer->id)->exists()
        );
    }

    public function test_organization_registration_requires_proof_and_persists_file(): void
    {
        Storage::fake('public');

        $this->postJson('/api/register', [
            'firstName' => 'Org',
            'lastName' => 'Admin',
            'email' => 'org@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phoneNumber' => '09123456789',
            'role' => 'ngo',
            'organization' => 'Blue Water Group',
            'areaOfResponsibility' => 'Metro Manila',
        ])->assertStatus(422)
            ->assertJsonPath('errors.organization_proof_document.0', 'Proof of legitimacy document is required for organization accounts.');

        $file = UploadedFile::fake()->create('proof.pdf', 100, 'application/pdf');

        $this->post('/api/register', [
            'firstName' => 'Org',
            'lastName' => 'Admin',
            'email' => 'org2@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phoneNumber' => '09123456789',
            'role' => 'ngo',
            'organization' => 'Blue Water Group',
            'areaOfResponsibility' => 'Metro Manila',
            'organization_proof_document' => $file,
        ])->assertStatus(201)
            ->assertJsonPath('user.organization', 'Blue Water Group');

        $created = User::where('email', 'org2@example.com')->firstOrFail();
        $this->assertNotNull($created->organization_proof_document);

        $storedPath = str_replace('/storage/', '', (string) $created->organization_proof_document);
        $this->assertTrue(Storage::disk('public')->exists($storedPath));
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
            'push_notifications_enabled' => true,
            'push_pref_report_updates' => true,
            'push_pref_event_reminders' => true,
            'push_pref_achievements' => false,
            'push_quiet_hours_enabled' => false,
        ]);
    }
}
