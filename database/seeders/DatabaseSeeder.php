<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Report;
use App\Models\ReportGroup;
use App\Models\SystemSetting;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $faker = fake();

        DB::transaction(function () use ($faker) {
            Schema::disableForeignKeyConstraints();
            DB::table('event_user')->delete();
            Report::query()->delete();
            Event::query()->delete();
            ReportGroup::query()->delete();
            SystemSetting::query()->delete();
            User::query()->delete();
            Schema::enableForeignKeyConstraints();

            $userRows = [];
            for ($i = 1; $i <= 10; $i++) {
                $userRows[] = [
                    'firstName' => $faker->firstName(),
                    'lastName' => $faker->lastName(),
                    'email' => "demo.user{$i}@waterbase.local",
                    'password' => Hash::make('password'),
                    'phoneNumber' => '09' . $faker->numerify('#########'),
                    'role' => $i === 1 ? 'admin' : 'volunteer',
                    'organization' => $faker->randomElement(['WaterBase', 'LGU', 'Community Group']),
                    'areaOfResponsibility' => $faker->city(),
                    'bbox_south' => $faker->randomFloat(6, 5.8, 15.9),
                    'bbox_north' => $faker->randomFloat(6, 6.0, 16.2),
                    'bbox_west' => $faker->randomFloat(6, 116.8, 125.8),
                    'bbox_east' => $faker->randomFloat(6, 117.1, 126.1),
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            User::query()->insert($userRows);
            $userIds = User::query()->pluck('id')->all();

            $eventRows = [];
            for ($i = 1; $i <= 10; $i++) {
                $eventRows[] = [
                    'title' => "Community Cleanup #{$i}",
                    'address' => $faker->address(),
                    'latitude' => $faker->randomFloat(8, 6.0, 18.0),
                    'longitude' => $faker->randomFloat(8, 116.0, 127.0),
                    'date' => now()->addDays($faker->numberBetween(-15, 30))->toDateString(),
                    'time' => $faker->time('H:i:s'),
                    'duration' => $faker->randomFloat(1, 1.0, 8.0),
                    'description' => $faker->sentence(14),
                    'maxVolunteers' => $faker->numberBetween(15, 80),
                    'currentVolunteers' => 0,
                    'points' => $faker->numberBetween(10, 100),
                    'badge' => $faker->randomElement(['starter', 'impact', 'coastal-hero', 'river-guardian']),
                    'status' => $faker->randomElement(['recruiting', 'active', 'completed', 'cancelled']),
                    'user_id' => $faker->randomElement($userIds),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            Event::query()->insert($eventRows);
            $eventIds = Event::query()->pluck('id')->all();

            $groupRows = [];
            for ($i = 1; $i <= 10; $i++) {
                $groupRows[] = [
                    'center_latitude' => $faker->randomFloat(8, 6.0, 18.0),
                    'center_longitude' => $faker->randomFloat(8, 116.0, 127.0),
                    'radius_meters' => $faker->randomFloat(2, 25, 350),
                    'first_report_at' => now()->subDays($faker->numberBetween(10, 40)),
                    'last_report_at' => now()->subDays($faker->numberBetween(0, 9)),
                    'cleanup_event_id' => $faker->optional(0.6)->randomElement($eventIds),
                    'is_active' => $faker->boolean(75),
                    'report_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            ReportGroup::query()->insert($groupRows);
            $groupIds = ReportGroup::query()->pluck('id')->all();

            $events = Event::all();
            foreach ($events as $event) {
                $event->report_group_id = $faker->optional(0.5)->randomElement($groupIds);
                $event->save();
            }

            $reportRows = [];
            for ($i = 1; $i <= 10; $i++) {
                $status = $faker->randomElement(['pending', 'verified', 'resolved', 'declined']);
                $verifiedBy = in_array($status, ['verified', 'resolved'], true) ? $faker->randomElement($userIds) : null;
                $verifiedAt = $verifiedBy ? now()->subDays($faker->numberBetween(0, 10)) : null;

                $reportRows[] = [
                    'title' => "Water Pollution Report #{$i}",
                    'content' => $faker->sentence(18),
                    'address' => $faker->address(),
                    'latitude' => $faker->randomFloat(8, 6.0, 18.0),
                    'longitude' => $faker->randomFloat(8, 116.0, 127.0),
                    'pollutionType' => $faker->randomElement(['plastic', 'oil', 'chemical', 'organic', 'mixed']),
                    'status' => $status,
                    'image' => 'https://picsum.photos/seed/report-' . $i . '/640/480',
                    'severityByUser' => $faker->randomElement(['low', 'medium', 'high', 'critical']),
                    'severityByAI' => $faker->randomElement(['low', 'medium', 'high', 'critical']),
                    'ai_confidence' => $faker->randomFloat(2, 55, 99),
                    'severityPercentage' => $faker->randomFloat(2, 20, 100),
                    'ai_verified' => $faker->boolean(60),
                    'ai_annotated_image' => 'https://picsum.photos/seed/annotated-' . $i . '/640/480',
                    'user_id' => $faker->randomElement($userIds),
                    'report_group_id' => $faker->optional(0.8)->randomElement($groupIds),
                    'verifiedBy' => $verifiedBy,
                    'verified_at' => $verifiedAt,
                    'admin_notes' => $faker->optional(0.5)->sentence(10),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            Report::query()->insert($reportRows);

            $eventUserRows = [];
            $eventUserKeys = [];
            while (count($eventUserRows) < 10) {
                $userId = $faker->randomElement($userIds);
                $eventId = $faker->randomElement($eventIds);
                $key = $userId . '-' . $eventId;

                if (isset($eventUserKeys[$key])) {
                    continue;
                }

                $eventUserKeys[$key] = true;
                $eventUserRows[] = [
                    'user_id' => $userId,
                    'event_id' => $eventId,
                    'joined_at' => now()->subDays($faker->numberBetween(0, 12)),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            DB::table('event_user')->insert($eventUserRows);

            $countsByEvent = DB::table('event_user')
                ->selectRaw('event_id, COUNT(*) as volunteers')
                ->groupBy('event_id')
                ->pluck('volunteers', 'event_id');

            foreach ($countsByEvent as $eventId => $volunteers) {
                Event::query()->where('id', $eventId)->update(['currentVolunteers' => $volunteers]);
            }

            $countsByGroup = Report::query()
                ->whereNotNull('report_group_id')
                ->selectRaw('report_group_id, COUNT(*) as total')
                ->groupBy('report_group_id')
                ->pluck('total', 'report_group_id');

            foreach ($countsByGroup as $groupId => $total) {
                ReportGroup::query()->where('id', $groupId)->update(['report_count' => $total]);
            }

            $settingRows = [];
            for ($i = 1; $i <= 10; $i++) {
                $settingRows[] = [
                    'auto_approve_enabled' => $faker->boolean(40),
                    'auto_approve_threshold' => $faker->numberBetween(60, 95),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            SystemSetting::query()->insert($settingRows);
        });
    }
}
