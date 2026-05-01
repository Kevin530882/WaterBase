<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class MaintenanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Get system health status
     */
    public function healthCheck()
    {
        if ((Auth::user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $health = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'queue' => $this->checkQueue(),
            'storage' => $this->checkStorage(),
            'timestamp' => now(),
        ];

        return response()->json(['data' => $health]);
    }

    /**
     * Clear application cache
     */
    public function clearCache()
    {
        if ((Auth::user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            Artisan::call('cache:clear');
            
            Log::info('Cache cleared by admin', [
                'user_id' => Auth::id(),
                'timestamp' => now(),
            ]);

            return response()->json([
                'message' => 'Application cache cleared successfully',
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Cache clear failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Cache clear failed'], 500);
        }
    }

    /**
     * Clear view cache
     */
    public function clearViewCache()
    {
        if ((Auth::user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            Artisan::call('view:clear');
            
            Log::info('View cache cleared by admin', [
                'user_id' => Auth::id(),
                'timestamp' => now(),
            ]);

            return response()->json([
                'message' => 'View cache cleared successfully',
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('View cache clear failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'View cache clear failed'], 500);
        }
    }

    /**
     * Clear route cache
     */
    public function clearRouteCache()
    {
        if ((Auth::user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            Artisan::call('route:clear');
            
            Log::info('Route cache cleared by admin', [
                'user_id' => Auth::id(),
                'timestamp' => now(),
            ]);

            return response()->json([
                'message' => 'Route cache cleared successfully',
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Route cache clear failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Route cache clear failed'], 500);
        }
    }

    /**
     * Restart queue worker
     */
    public function restartQueue()
    {
        if ((Auth::user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            Artisan::call('queue:restart');
            
            Log::info('Queue restarted by admin', [
                'user_id' => Auth::id(),
                'timestamp' => now(),
            ]);

            return response()->json([
                'message' => 'Queue worker restarted successfully',
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Queue restart failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Queue restart failed'], 500);
        }
    }

    /**
     * Get application logs (paginated)
     */
    public function getLogs(Request $request)
    {
        if ((Auth::user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            $logFile = storage_path('logs/laravel.log');
            
            if (!File::exists($logFile)) {
                return response()->json(['data' => [], 'message' => 'No logs found']);
            }

            $lines = File::lines($logFile)->take(-100)->toArray();
            $logs = array_map(fn($line) => [
                'message' => trim((string) $line),
                'timestamp' => now(),
            ], $lines);

            return response()->json(['data' => array_reverse($logs)]);
        } catch (\Exception $e) {
            Log::error('Logs export failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Logs export failed'], 500);
        }
    }

    /**
     * Export logs as file
     */
    public function exportLogs()
    {
        if ((Auth::user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            $logFile = storage_path('logs/laravel.log');
            
            if (!File::exists($logFile)) {
                return response()->json(['error' => 'No logs found'], 404);
            }

            Log::info('Logs exported by admin', [
                'user_id' => Auth::id(),
                'timestamp' => now(),
            ]);

            return response()->download($logFile, 'laravel-logs-' . now()->format('Y-m-d-His') . '.log');
        } catch (\Exception $e) {
            Log::error('Logs download failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Logs download failed'], 500);
        }
    }

    /**
     * Get system statistics
     */
    public function getStatistics()
    {
        if ((Auth::user()?->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $stats = [
            'uptime' => $this->getUptime(),
            'disk_usage' => $this->getDiskUsage(),
            'memory_usage' => $this->getMemoryUsage(),
            'timestamp' => now(),
        ];

        return response()->json(['data' => $stats]);
    }

    /**
     * Check database connection
     */
    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            return ['status' => 'ok', 'response_time' => 'good'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Check cache connection
     */
    private function checkCache(): array
    {
        try {
            Cache::put('health_check_test', 'test', 1);
            Cache::forget('health_check_test');
            return ['status' => 'ok'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Check queue status
     */
    private function checkQueue(): array
    {
        try {
            $failedJobs = DB::table('failed_jobs')->count();
            return ['status' => 'ok', 'failed_jobs' => $failedJobs];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Check storage
     */
    private function checkStorage(): array
    {
        try {
            return ['status' => 'ok', 'disk_free_gb' => round(disk_free_space(base_path()) / 1024 / 1024 / 1024, 2)];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Get system uptime (estimate)
     */
    private function getUptime(): string
    {
        try {
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $cmd = 'powershell -Command "(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime"';
            } else {
                $cmd = 'uptime -p';
            }
            $output = shell_exec($cmd);
            return trim($output ?? 'N/A');
        } catch (\Exception $e) {
            return 'N/A';
        }
    }

    /**
     * Get disk usage statistics
     */
    private function getDiskUsage(): array
    {
        try {
            $total = disk_total_space(base_path());
            $free = disk_free_space(base_path());
            $used = $total - $free;

            return [
                'total_gb' => round($total / 1024 / 1024 / 1024, 2),
                'used_gb' => round($used / 1024 / 1024 / 1024, 2),
                'free_gb' => round($free / 1024 / 1024 / 1024, 2),
                'used_percent' => round(($used / $total) * 100, 2),
            ];
        } catch (\Exception $e) {
            return ['status' => 'error'];
        }
    }

    /**
     * Get memory usage statistics
     */
    private function getMemoryUsage(): array
    {
        try {
            $memory = memory_get_usage(true);
            $peak = memory_get_peak_usage(true);

            return [
                'current_mb' => round($memory / 1024 / 1024, 2),
                'peak_mb' => round($peak / 1024 / 1024, 2),
            ];
        } catch (\Exception $e) {
            return ['status' => 'error'];
        }
    }
}
