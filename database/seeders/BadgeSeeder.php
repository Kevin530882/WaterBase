<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            [
                'name' => 'Water Guardian',
                'description' => 'Awarded for submitting 10 or more pollution reports that have been verified by admins.',
                'type' => 'auto',
                'criteria' => ['min_reports' => 10, 'status' => 'verified'],
                'icon_url' => null,
            ],
            [
                'name' => 'Eco Champion',
                'description' => 'Earned by volunteers who participate in 5 or more cleanup events.',
                'type' => 'auto',
                'criteria' => ['min_events' => 5],
                'icon_url' => null,
            ],
            [
                'name' => 'First Report',
                'description' => 'Awarded upon submitting your very first pollution report.',
                'type' => 'auto',
                'criteria' => ['min_reports' => 1],
                'icon_url' => null,
            ],
            [
                'name' => 'Community Hero',
                'description' => 'Given to users who help organize or lead community cleanup events.',
                'type' => 'manual',
                'criteria' => null,
                'icon_url' => null,
            ],
            [
                'name' => 'Rising Star',
                'description' => 'Awarded to new active members who show great dedication within their first month.',
                'type' => 'manual',
                'criteria' => null,
                'icon_url' => null,
            ],
            [
                'name' => 'Top Reporter',
                'description' => 'Recognizes users who have submitted 25 or more reports with high AI confidence scores.',
                'type' => 'auto',
                'criteria' => ['min_reports' => 25, 'min_confidence' => 0.85],
                'icon_url' => null,
            ],
            [
                'name' => 'LGU Partner',
                'description' => 'Awarded to Local Government Unit representatives actively using the platform.',
                'type' => 'manual',
                'criteria' => null,
                'icon_url' => null,
            ],
            [
                'name' => 'NGO Ally',
                'description' => 'Recognizes Non-Governmental Organization staff who coordinate multiple cleanup events.',
                'type' => 'manual',
                'criteria' => null,
                'icon_url' => null,
            ],
            [
                'name' => 'Research Contributor',
                'description' => 'Awarded to researchers who publish data or insights that help protect Philippine waters.',
                'type' => 'manual',
                'criteria' => null,
                'icon_url' => null,
            ],
            [
                'name' => 'Century Club',
                'description' => 'Awarded to users who have earned 100 or more community points.',
                'type' => 'auto',
                'criteria' => ['min_points' => 100],
                'icon_url' => null,
            ],
            [
                'name' => 'Event Organizer',
                'description' => 'Given to users who successfully organize and complete their first cleanup event.',
                'type' => 'manual',
                'criteria' => null,
                'icon_url' => null,
            ],
            [
                'name' => 'Verified Eye',
                'description' => 'Awarded to users whose field verifications have a 90%+ accuracy rate.',
                'type' => 'auto',
                'criteria' => ['min_accuracy' => 0.90],
                'icon_url' => null,
            ],
        ];

        foreach ($badges as $badge) {
            Badge::firstOrCreate(
                ['name' => $badge['name']],
                $badge
            );
        }
    }
}