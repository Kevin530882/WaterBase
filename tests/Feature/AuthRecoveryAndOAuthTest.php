<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthRecoveryAndOAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_returns_generic_success_and_stores_token(): void
    {
        Mail::fake();
        $user = $this->createVolunteer(['email' => 'maria@example.com']);

        $response = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ]);

        $response->assertOk()
            ->assertJson([
                'message' => 'If an account exists for that email, a password reset link has been sent.',
            ]);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => $user->email,
        ]);
    }

    public function test_forgot_password_does_not_reveal_missing_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'missing@example.com',
        ]);

        $response->assertOk()
            ->assertJson([
                'message' => 'If an account exists for that email, a password reset link has been sent.',
            ]);

        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'missing@example.com',
        ]);
    }

    public function test_reset_password_with_valid_token_updates_password_and_deletes_token(): void
    {
        $user = $this->createVolunteer(['email' => 'maria@example.com']);
        $token = 'plain-reset-token';

        DB::table('password_reset_tokens')->insert([
            'email' => $user->email,
            'token' => Hash::make($token),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $user->email,
        ]);
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = $this->createVolunteer(['email' => 'maria@example.com']);

        DB::table('password_reset_tokens')->insert([
            'email' => $user->email,
            'token' => Hash::make('correct-token'),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => 'wrong-token',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertStatus(422);
    }

    public function test_google_mobile_links_existing_email_account(): void
    {
        config(['services.google.mobile_client_id' => 'google-client-id']);
        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'google-client-id',
                'sub' => 'google-user-123',
                'email' => 'maria@example.com',
                'email_verified' => 'true',
                'name' => 'Maria Santos',
                'picture' => 'https://example.com/avatar.jpg',
            ]),
        ]);
        $user = $this->createVolunteer(['email' => 'maria@example.com']);

        $response = $this->postJson('/api/auth/google/mobile', [
            'id_token' => 'google-id-token',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'maria@example.com')
            ->assertJsonPath('user.profile_completed', true)
            ->assertJsonStructure(['access_token', 'token_type']);

        $this->assertSame('google-user-123', $user->fresh()->google_id);
    }

    public function test_google_mobile_creates_incomplete_volunteer_for_new_email(): void
    {
        config(['services.google.mobile_client_id' => 'google-client-id']);
        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'google-client-id',
                'sub' => 'google-user-456',
                'email' => 'new@example.com',
                'email_verified' => 'true',
                'name' => 'New Volunteer',
                'picture' => 'https://example.com/avatar.jpg',
            ]),
        ]);

        $response = $this->postJson('/api/auth/google/mobile', [
            'id_token' => 'google-id-token',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'new@example.com')
            ->assertJsonPath('user.role', 'volunteer')
            ->assertJsonPath('user.profile_completed', false);

        $this->assertDatabaseHas('users', [
            'email' => 'new@example.com',
            'role' => 'volunteer',
            'google_id' => 'google-user-456',
            'phoneNumber' => '',
        ]);
    }

    private function createVolunteer(array $overrides = []): User
    {
        return User::create(array_merge([
            'firstName' => 'Maria',
            'lastName' => 'Santos',
            'email' => 'maria@example.com',
            'password' => Hash::make('password'),
            'phoneNumber' => '09123456789',
            'role' => 'volunteer',
            'approval_status' => User::STATUS_APPROVED,
            'profile_completed_at' => now(),
        ], $overrides));
    }
}
