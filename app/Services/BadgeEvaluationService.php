<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class BadgeEvaluationService
{
    public function evaluateAndAward(User $user): array
    {
        $autoBadges = Badge::where('type', 'auto')->get();

        if ($autoBadges->isEmpty()) {
            return [];
        }

        $earnedBadgeIds = $user->badges()
            ->wherePivotNull('revoked_at')
            ->pluck('badges.id')
            ->toArray();

        $newlyAwarded = [];

        foreach ($autoBadges as $badge) {
            if (in_array($badge->id, $earnedBadgeIds)) {
                continue;
            }

            if ($this->checkCriteria($user, $badge)) {
                $user->badges()->syncWithoutDetaching([
                    $badge->id => ['earned_at' => now()]
                ]);
                $newlyAwarded[] = $badge->name;

                Log::info('Badge awarded via auto-evaluation', [
                    'user_id' => $user->id,
                    'badge_id' => $badge->id,
                    'badge_name' => $badge->name,
                ]);
            }
        }

        return $newlyAwarded;
    }

    private function checkCriteria(User $user, Badge $badge): bool
    {
        $criteria = $badge->criteria;

        if (!is_array($criteria) || empty($criteria)) {
            return false;
        }

        if (array_key_exists('min_reports', $criteria)) {
            $query = Report::where('user_id', $user->id);

            if (isset($criteria['status'])) {
                $query->where('status', $criteria['status']);
            }

            if ($query->count() < $criteria['min_reports']) {
                return false;
            }
        }

        if (array_key_exists('min_events', $criteria)) {
            if ($user->attendedEvents()->count() < $criteria['min_events']) {
                return false;
            }
        }

        if (array_key_exists('min_points', $criteria)) {
            $reportsCount = Report::where('user_id', $user->id)->count();
            $eventPoints = $user->attendedEvents()
                ->where('status', 'completed')
                ->whereNotNull('badge')
                ->sum('points') ?? 0;
            $totalPoints = ($reportsCount * 10) + $eventPoints;

            if ($totalPoints < $criteria['min_points']) {
                return false;
            }
        }

        if (array_key_exists('min_confidence', $criteria)) {
            $avgConfidence = Report::where('user_id', $user->id)->avg('ai_confidence');

            if ($avgConfidence === null || $avgConfidence < $criteria['min_confidence']) {
                return false;
            }
        }

        if (array_key_exists('min_accuracy', $criteria)) {
            return false;
        }

        return true;
    }
}