<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AddPerformanceMetricsHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $enabled = Cache::remember(
            'system_settings.performance_metrics_enabled',
            now()->addSeconds(30),
            fn () => (bool) SystemSetting::current()->performance_metrics_enabled
        );

        if (!$enabled) {
            return $next($request);
        }

        $start = microtime(true);
        $queryCount = 0;
        $queryMs = 0.0;

        DB::listen(function ($query) use (&$queryCount, &$queryMs): void {
            $queryCount++;
            $queryMs += (float) $query->time;
        });

        $response = $next($request);
        $requestMs = (microtime(true) - $start) * 1000;

        $response->headers->set('X-WaterBase-Request-Ms', (string) round($requestMs, 2));
        $response->headers->set('X-WaterBase-Db-Ms', (string) round($queryMs, 2));
        $response->headers->set('X-WaterBase-Db-Queries', (string) $queryCount);

        return $response;
    }
}
