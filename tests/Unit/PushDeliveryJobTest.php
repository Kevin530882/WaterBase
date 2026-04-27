<?php

namespace Tests\Unit;

use App\Jobs\DeliverUserNotificationJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PushDeliveryJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_delivery_job_sends_push_when_enabled_and_user_has_token(): void
    {
        config()->set('services.waterbase_push.enabled', true);
        config()->set('services.waterbase_push.allowed_types', ['report_status_changed']);
        config()->set('services.waterbase_push.provider_url', 'https://exp.host/--/api/v2/push/send');

        Http::fake([
            'https://exp.host/*' => Http::response(['data' => ['status' => 'ok']], 200),
        ]);

        $user = $this->makeUser('volunteer');
        $user->expo_push_token = 'ExponentPushToken[test-token]';
        $user->push_notifications_enabled = true;
        $user->save();

        $job = new DeliverUserNotificationJob(
            userId: $user->id,
            type: 'report_status_changed',
            channel: 'in_app',
            severity: 'info',
            title: 'Report status updated',
            message: 'Your report is now verified.',
            metadata: [
                'target_id' => '10',
                'target_type' => 'report',
            ],
            idempotencyKey: 'push-test-idempotency-1'
        );

        $job->handle();

        Http::assertSent(function ($request) {
            return $request->url() === 'https://exp.host/--/api/v2/push/send'
                && $request['to'] === 'ExponentPushToken[test-token]'
                && $request['title'] === 'Report status updated';
        });

        $this->assertDatabaseHas('user_notifications', [
            'idempotency_key' => 'push-test-idempotency-1',
            'user_id' => $user->id,
            'type' => 'report_status_changed',
            'channel' => 'in_app',
        ]);
    }

    public function test_delivery_job_skips_push_when_user_has_no_token(): void
    {
        config()->set('services.waterbase_push.enabled', true);
        config()->set('services.waterbase_push.allowed_types', ['event_created']);

        Http::fake();

        $user = $this->makeUser('volunteer');
        $user->expo_push_token = null;
        $user->push_notifications_enabled = true;
        $user->save();

        $job = new DeliverUserNotificationJob(
            userId: $user->id,
            type: 'event_created',
            channel: 'in_app',
            severity: 'info',
            title: 'Event created',
            message: 'A new event is available.',
            metadata: [
                'target_id' => '12',
                'target_type' => 'event',
            ],
            idempotencyKey: 'push-test-idempotency-2'
        );

        $job->handle();

        Http::assertNothingSent();
    }

    public function test_delivery_job_skips_push_during_quiet_hours(): void
    {
        config()->set('services.waterbase_push.enabled', true);
        config()->set('services.waterbase_push.allowed_types', ['event_created']);

        Http::fake();

        $user = $this->makeUser('volunteer');
        $user->expo_push_token = 'ExponentPushToken[test-token]';
        $user->push_notifications_enabled = true;
        $user->push_pref_event_reminders = true;
        $user->push_quiet_hours_enabled = true;
        $user->push_quiet_hours_start = now()->subMinute()->format('H:i');
        $user->push_quiet_hours_end = now()->addMinute()->format('H:i');
        $user->save();

        $job = new DeliverUserNotificationJob(
            userId: $user->id,
            type: 'event_created',
            channel: 'in_app',
            severity: 'info',
            title: 'Event created',
            message: 'A new event is available.',
            metadata: [
                'target_id' => '15',
                'target_type' => 'event',
            ],
            idempotencyKey: 'push-test-idempotency-3'
        );

        $job->handle();

        Http::assertNothingSent();
    }

    public function test_delivery_job_clears_token_when_provider_marks_device_unregistered(): void
    {
        config()->set('services.waterbase_push.enabled', true);
        config()->set('services.waterbase_push.allowed_types', ['report_status_changed']);
        config()->set('services.waterbase_push.provider_url', 'https://exp.host/--/api/v2/push/send');

        Http::fake([
            'https://exp.host/*' => Http::response([
                'data' => [[
                    'status' => 'error',
                    'details' => ['error' => 'DeviceNotRegistered'],
                ]],
            ], 200),
        ]);

        $user = $this->makeUser('volunteer');
        $user->expo_push_token = 'ExponentPushToken[stale-token]';
        $user->push_notifications_enabled = true;
        $user->save();

        $job = new DeliverUserNotificationJob(
            userId: $user->id,
            type: 'report_status_changed',
            channel: 'in_app',
            severity: 'info',
            title: 'Report status updated',
            message: 'Your report is now verified.',
            metadata: [
                'target_id' => '18',
                'target_type' => 'report',
            ],
            idempotencyKey: 'push-test-idempotency-4'
        );

        $job->handle();

        $user->refresh();
        $this->assertNull($user->expo_push_token);
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
