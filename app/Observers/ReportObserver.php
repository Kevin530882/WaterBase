<?php

namespace App\Observers;

use App\Models\Report;
use App\Services\ReportAccessControlService;
use Illuminate\Support\Facades\Log;

class ReportObserver
{
    private ReportAccessControlService $accessControlService;

    public function __construct(ReportAccessControlService $accessControlService)
    {
        $this->accessControlService = $accessControlService;
    }

    /**
     * Handle the Report "created" event.
     */
    public function created(Report $report): void
    {
        // Automatically geocode new reports
        if ($report->latitude && $report->longitude && !$report->isGeocoded()) {
            try {
                $this->accessControlService->geocodeReport($report);
            } catch (\Exception $e) {
                Log::warning('Failed to auto-geocode new report', [
                    'report_id' => $report->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Handle the Report "updated" event.
     */
    public function updated(Report $report): void
    {
        // Re-geocode if coordinates changed
        if (
            $report->isDirty(['latitude', 'longitude']) &&
            $report->latitude && $report->longitude
        ) {
            try {
                $this->accessControlService->geocodeReport($report);
            } catch (\Exception $e) {
                Log::warning('Failed to re-geocode updated report', [
                    'report_id' => $report->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Handle the Report "deleted" event.
     */
    public function deleted(Report $report): void
    {
        // If this was the last report in a group, consider deactivating the group
        if ($report->reportGroup) {
            $remainingReports = $report->reportGroup->reports()
                ->where('id', '!=', $report->id)
                ->count();

            if ($remainingReports === 0) {
                $report->reportGroup->update(['is_active' => false]);
            } else {
                // Update group statistics
                $report->reportGroup->update([
                    'report_count' => $remainingReports
                ]);
            }
        }
    }

    /**
     * Handle the Report "restored" event.
     */
    public function restored(Report $report): void
    {
        // Re-activate group if needed and re-geocode
        if ($report->reportGroup) {
            $report->reportGroup->update(['is_active' => true]);
        }

        if ($report->latitude && $report->longitude) {
            try {
                $this->accessControlService->geocodeReport($report);
            } catch (\Exception $e) {
                Log::warning('Failed to geocode restored report', [
                    'report_id' => $report->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Handle the Report "force deleted" event.
     */
    public function forceDeleted(Report $report): void
    {
        // Same as deleted
        $this->deleted($report);
    }
}
