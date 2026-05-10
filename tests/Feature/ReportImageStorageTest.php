<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use App\Services\BadgeEvaluationService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Ramsey\Uuid\Uuid;
use Tests\TestCase;

class ReportImageStorageTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        Str::createUuidsNormally();

        parent::tearDown();
    }

    public function test_reports_with_same_client_filename_get_distinct_images_and_annotated_paths(): void
    {
        Storage::fake('public');
        Carbon::setTestNow('2026-05-10 12:00:00');
        Str::createUuidsUsingSequence([
            Uuid::fromString('11111111-1111-4111-8111-111111111111'),
            Uuid::fromString('22222222-2222-4222-8222-222222222222'),
        ]);
        $this->fakeReportSideEffects();
        $this->registerSqliteMathFunctions();

        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $firstImagePath = 'uploads/20260510120000_11111111-1111-4111-8111-111111111111_pollution-report.jpg';
        $secondImagePath = 'uploads/20260510120000_22222222-2222-4222-8222-222222222222_pollution-report.jpg';
        $firstAnnotatedPath = 'uploads/20260510120000_11111111-1111-4111-8111-111111111111_pollution-report_annotated.jpg';
        $secondAnnotatedPath = 'uploads/20260510120000_22222222-2222-4222-8222-222222222222_pollution-report_annotated.jpg';

        Storage::disk('public')->put($firstAnnotatedPath, 'first annotated');
        Storage::disk('public')->put($secondAnnotatedPath, 'second annotated');

        $this->post('/api/reports', $this->validReportPayload($user, 'First report'))
            ->assertStatus(202);

        $this->post('/api/reports', $this->validReportPayload($user, 'Second report'))
            ->assertStatus(202);

        $firstReport = Report::where('title', 'First report')->firstOrFail();
        $secondReport = Report::where('title', 'Second report')->firstOrFail();

        $this->assertSame(Storage::url($firstImagePath), $firstReport->image);
        $this->assertSame(Storage::url($secondImagePath), $secondReport->image);
        $this->assertNotSame($firstReport->image, $secondReport->image);
        $this->assertSame(Storage::url($firstAnnotatedPath), $firstReport->ai_annotated_image);
        $this->assertSame(Storage::url($secondAnnotatedPath), $secondReport->ai_annotated_image);
        Storage::disk('public')->assertExists($firstImagePath);
        Storage::disk('public')->assertExists($secondImagePath);
    }

    public function test_report_without_annotated_file_falls_back_to_its_own_stored_image(): void
    {
        Storage::fake('public');
        Carbon::setTestNow('2026-05-10 12:00:00');
        Str::createUuidsUsingSequence([
            Uuid::fromString('33333333-3333-4333-8333-333333333333'),
        ]);
        $this->fakeReportSideEffects();
        $this->registerSqliteMathFunctions();

        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->post('/api/reports', $this->validReportPayload($user, 'Fallback report'))
            ->assertStatus(202);

        $report = Report::where('title', 'Fallback report')->firstOrFail();

        $expectedImageUrl = Storage::url('uploads/20260510120000_33333333-3333-4333-8333-333333333333_pollution-report.jpg');
        $this->assertSame($expectedImageUrl, $report->image);
        $this->assertSame($expectedImageUrl, $report->ai_annotated_image);
    }

    private function validReportPayload(User $user, string $title): array
    {
        return [
            'title' => $title,
            'content' => 'Observed polluted water.',
            'address' => 'Pasig River, Metro Manila',
            'latitude' => '14.59950000',
            'longitude' => '121.00080000',
            'pollutionType' => 'Plastic Pollution',
            'status' => 'pending',
            'image' => $this->fakeJpegUpload('pollution_report.jpg'),
            'severityByUser' => 'medium',
            'user_id' => $user->id,
            'severityByAI' => 'medium',
            'ai_verified' => '1',
            'ai_confidence' => '88.25',
            'severityPercentage' => '42.50',
        ];
    }

    private function fakeJpegUpload(string $name): UploadedFile
    {
        $onePixelJpeg = base64_decode(
            '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z'
        );

        return UploadedFile::fake()->createWithContent($name, $onePixelJpeg);
    }

    private function makeUser(): User
    {
        return User::create([
            'firstName' => 'Volunteer',
            'lastName' => 'Tester',
            'email' => uniqid('volunteer.', true) . '@example.com',
            'password' => Hash::make('password123'),
            'phoneNumber' => '09123456789',
            'role' => 'volunteer',
            'areaOfResponsibility' => 'Metro Manila',
        ]);
    }

    private function fakeReportSideEffects(): void
    {
        $this->mock(NotificationService::class, function ($mock) {
            $mock->shouldReceive('notifyReportStatusChanged')->zeroOrMoreTimes();
            $mock->shouldReceive('notifyReportProcessingFailed')->zeroOrMoreTimes();
        });

        $this->mock(BadgeEvaluationService::class, function ($mock) {
            $mock->shouldReceive('evaluateAndAward')->zeroOrMoreTimes()->andReturn([]);
        });
    }

    private function registerSqliteMathFunctions(): void
    {
        $pdo = DB::connection()->getPdo();

        if (method_exists($pdo, 'sqliteCreateFunction')) {
            $pdo->sqliteCreateFunction('SQRT', fn ($value) => sqrt((float) $value), 1);
            $pdo->sqliteCreateFunction('POW', fn ($base, $exp) => pow((float) $base, (float) $exp), 2);
        }
    }
}
