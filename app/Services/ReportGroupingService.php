<?php

namespace App\Services;

use App\Models\Report;
use App\Models\ReportGroup;
use App\Models\Event;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportGroupingService
{
    private float $defaultRadius;
    private int $groupingDays;

    public function __construct()
    {
        $this->defaultRadius = config('app.report_grouping_radius', 50.0); // meters
        $this->groupingDays = config('app.report_grouping_days', 7); // days
    }

    /**
     * Process a new report and assign it to appropriate group
     */
    public function processNewReport(Report $report): void
    {
        // Find existing active groups within radius
        $existingGroup = $this->findNearbyActiveGroup(
            (float) $report->latitude,
            (float) $report->longitude
        );

        if ($existingGroup) {
            $this->addReportToGroup($report, $existingGroup);
        } else {
            $this->createNewGroup($report);
        }
    }

    /**
     * Find nearby active report group within radius
     */
    private function findNearbyActiveGroup(float $latitude, float $longitude): ?ReportGroup
    {
        $cutoffDate = Carbon::now()->subDays($this->groupingDays);

        return ReportGroup::where('is_active', true)
            ->whereNull('cleanup_event_id')
            ->where('last_report_at', '>=', $cutoffDate)
            ->get()
            ->filter(function (ReportGroup $group) use ($latitude, $longitude) {
                return $group->containsPoint($latitude, $longitude);
            })
            ->first();
    }

    /**
     * Add report to existing group
     */
    private function addReportToGroup(Report $report, ReportGroup $group): void
    {
        DB::transaction(function () use ($report, $group) {
            $report->update(['report_group_id' => $group->id]);

            // Update group statistics
            $group->update([
                'last_report_at' => $report->created_at,
                'report_count' => $group->report_count + 1,
                // Optionally update center point based on new report
                'center_latitude' => $this->calculateNewCenterLat($group, $report),
                'center_longitude' => $this->calculateNewCenterLng($group, $report),
            ]);
        });
    }

    /**
     * Create new report group
     */
    private function createNewGroup(Report $report): ReportGroup
    {
        return DB::transaction(function () use ($report) {
            $group = ReportGroup::create([
                'center_latitude' => (float) $report->latitude,
                'center_longitude' => (float) $report->longitude,
                'radius_meters' => $this->defaultRadius,
                'first_report_at' => $report->created_at,
                'last_report_at' => $report->created_at,
                'is_active' => true,
                'report_count' => 1,
            ]);

            $report->update(['report_group_id' => $group->id]);

            return $group;
        });
    }

    /**
     * Calculate new center latitude when adding a report to group
     */
    private function calculateNewCenterLat(ReportGroup $group, Report $report): float
    {
        $totalWeight = $group->report_count + 1;
        $existingWeight = $group->report_count;

        return (((float) $group->center_latitude * $existingWeight) + (float) $report->latitude) / $totalWeight;
    }

    /**
     * Calculate new center longitude when adding a report to group
     */
    private function calculateNewCenterLng(ReportGroup $group, Report $report): float
    {
        $totalWeight = $group->report_count + 1;
        $existingWeight = $group->report_count;

        return (((float) $group->center_longitude * $existingWeight) + (float) $report->longitude) / $totalWeight;
    }

    /**
     * Create cleanup event for a report group
     */
    public function createCleanupEvent(ReportGroup $group, array $eventData): Event
    {
        return DB::transaction(function () use ($group, $eventData) {
            $event = Event::create([
                'title' => $eventData['title'] ?? "Cleanup Event for Report Group #{$group->id}",
                'address' => $eventData['address'] ?? $this->generateAddressFromGroup($group),
                'latitude' => $eventData['latitude'] ?? (float) $group->center_latitude,
                'longitude' => $eventData['longitude'] ?? (float) $group->center_longitude,
                'date' => $eventData['date'],
                'time' => $eventData['time'],
                'duration' => $eventData['duration'],
                'description' => $eventData['description'] ?? $this->generateDescriptionFromGroup($group),
                'maxVolunteers' => $eventData['maxVolunteers'],
                'points' => $eventData['points'] ?? 10,
                'badge' => $eventData['badge'] ?? 'cleanup_badge.png',
                'status' => 'recruiting',
                'user_id' => $eventData['user_id'],
                'report_group_id' => $group->id,
            ]);

            // Link the group to the cleanup event and deactivate it
            $group->update([
                'cleanup_event_id' => $event->id,
                'is_active' => false,
            ]);

            return $event;
        });
    }

    /**
     * Generate address from group center coordinates
     */
    private function generateAddressFromGroup(ReportGroup $group): string
    {
        // In a real implementation, you'd reverse geocode the coordinates
        $lat = (float) $group->center_latitude;
        $lng = (float) $group->center_longitude;
        return "Cleanup Location (Lat: {$lat}, Lng: {$lng})";
    }

    /**
     * Generate event description from group reports
     */
    private function generateDescriptionFromGroup(ReportGroup $group): string
    {
        $reportCount = $group->report_count;
        $firstReport = $group->first_report_at->format('M j, Y');
        $lastReport = $group->last_report_at->format('M j, Y');

        return "Cleanup event for {$reportCount} pollution reports in this area from {$firstReport} to {$lastReport}.";
    }

    /**
     * Get nearby report groups within a larger radius (for finding related groups)
     */
    public function getNearbyGroups(float $latitude, float $longitude, float $radiusKm = 5.0): array
    {
        $radiusMeters = $radiusKm * 1000;

        return ReportGroup::all()
            ->filter(function (ReportGroup $group) use ($latitude, $longitude, $radiusMeters) {
                $distance = ReportGroup::calculateDistance(
                    $latitude,
                    $longitude,
                    (float) $group->center_latitude,
                    (float) $group->center_longitude
                );
                return $distance <= $radiusMeters;
            })
            ->sortBy(function (ReportGroup $group) use ($latitude, $longitude) {
                return ReportGroup::calculateDistance(
                    $latitude,
                    $longitude,
                    (float) $group->center_latitude,
                    (float) $group->center_longitude
                );
            })
            ->values()
            ->toArray();
    }

    /**
     * Reprocess old reports that might need regrouping
     */
    public function reprocessOldReports(): int
    {
        $processedCount = 0;
        $cutoffDate = Carbon::now()->subDays($this->groupingDays);

        // Get reports without groups or in inactive groups
        $reports = Report::where(function ($query) use ($cutoffDate) {
            $query->whereNull('report_group_id')
                ->orWhereHas('reportGroup', function ($subQuery) use ($cutoffDate) {
                    $subQuery->where('is_active', false)
                        ->where('last_report_at', '<', $cutoffDate);
                });
        })
            ->where('created_at', '>=', $cutoffDate)
            ->orderBy('created_at')
            ->get();

        foreach ($reports as $report) {
            // Remove from inactive group if necessary
            if ($report->reportGroup && !$report->reportGroup->is_active) {
                $report->update(['report_group_id' => null]);
            }

            // Reprocess the report
            $this->processNewReport($report);
            $processedCount++;
        }

        return $processedCount;
    }

    /**
     * Get report groups that might need cleanup events
     */
    public function getGroupsNeedingCleanup(int $minReports = 3, int $minDays = 7): array
    {
        $cutoffDate = Carbon::now()->subDays($minDays);

        return ReportGroup::where('is_active', true)
            ->whereNull('cleanup_event_id')
            ->where('report_count', '>=', $minReports)
            ->where('first_report_at', '<=', $cutoffDate)
            ->with([
                'reports' => function ($query) {
                    $query->latest()->limit(5);
                }
            ])
            ->get()
            ->toArray();
    }

    /**
     * Get statistics for report grouping
     */
    public function getGroupingStatistics(): array
    {
        $totalGroups = ReportGroup::count();
        $activeGroups = ReportGroup::where('is_active', true)->count();
        $groupsWithEvents = ReportGroup::whereNotNull('cleanup_event_id')->count();
        $reportsGrouped = Report::whereNotNull('report_group_id')->count();
        $totalReports = Report::count();

        return [
            'total_groups' => $totalGroups,
            'active_groups' => $activeGroups,
            'groups_with_cleanup_events' => $groupsWithEvents,
            'reports_grouped' => $reportsGrouped,
            'total_reports' => $totalReports,
            'grouping_percentage' => $totalReports > 0 ? round(($reportsGrouped / $totalReports) * 100, 2) : 0,
        ];
    }
}
