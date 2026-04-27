<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\User;
use App\Models\Event;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics for regular users
     */
    public function getStats()
    {
        $now = Carbon::now();
        $lastMonth = $now->copy()->subMonth();

        // Total reports count
        $totalReports = Report::count();
        $lastMonthReports = Report::where('created_at', '>=', $lastMonth)->count();
        $reportsGrowth = $totalReports > 0 ? round((($lastMonthReports / $totalReports) * 100), 1) : 0;

        // Verified reports (assuming status 'verified' or similar)
        $verifiedReports = Report::where('status', 'verified')->count();
        $verificationRate = $totalReports > 0 ? round(($verifiedReports / $totalReports) * 100) : 0;

        // Active users (users who have logged in or created reports in the last month)
        $activeUsers = User::where('updated_at', '>=', $lastMonth)->count();
        $totalUsers = User::count();
        $userGrowth = $totalUsers > 0 ? round((($activeUsers / $totalUsers) * 100), 1) : 0;

        // Events count (assuming events represent cleanup sites)
        $totalEvents = Event::count();
        $thisMonthEvents = Event::where('created_at', '>=', $now->copy()->startOfMonth())->count();

        return response()->json([
            'totalReports' => $totalReports,
            'reportsGrowth' => $reportsGrowth,
            'verifiedReports' => $verifiedReports,
            'verificationRate' => $verificationRate,
            'activeUsers' => $activeUsers,
            'userGrowth' => $userGrowth,
            'totalEvents' => $totalEvents,
            'thisMonthEvents' => $thisMonthEvents
        ]);
    }

    /**
     * Get recent reports for dashboard
     */
    public function getRecentReports()
    {
        $reports = Report::with(['user'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($report) {
                $reporterName = 'Anonymous';
                if ($report->user) {
                    $reporterName = $report->user->firstName . ' ' . $report->user->lastName;
                }

                return [
                    'id' => $report->id,
                    'location' => $report->location ?? $report->address ?? 'Location not specified',
                    'type' => $report->pollutionType ?? 'Unknown',
                    'severity' => $report->severityByUser ?? 'medium',
                    'time' => $report->created_at->diffForHumans(),
                    'status' => $report->status,
                    'reporter' => $reporterName
                ];
            });

        return response()->json($reports);
    }

    /**
     * Get reports grouped by region/area
     */
    public function getReportsByRegion()
    {
        $reportsByRegion = Report::query()
            ->selectRaw('TRIM(address) as area_of_responsibility, COUNT(*) as count')
            ->whereNotNull('address')
            ->whereRaw("TRIM(address) <> ''")
            ->groupBy(DB::raw('TRIM(address)'))
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get();

        return response()->json($reportsByRegion);
    }

    /**
     * Get monthly trends for reports
     */
    public function getMonthlyTrends()
    {
        $trends = Report::select(
            DB::raw('YEAR(created_at) as year'),
            DB::raw('MONTH(created_at) as month'),
            DB::raw('COUNT(*) as count')
        )
            ->where('created_at', '>=', Carbon::now()->subMonths(6))
            ->groupBy('year', 'month')
            ->orderBy('year', 'asc')
            ->orderBy('month', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'month' => Carbon::createFromDate($item->year, $item->month, 1)->format('M Y'),
                    'reports' => $item->count
                ];
            });

        return response()->json($trends);
    }
}
