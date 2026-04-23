<?php

namespace App\Http\Controllers;

use App\Services\ForecastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForecastController extends Controller
{
    public function __construct(private readonly ForecastService $forecastService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'metric' => 'nullable|in:report_volume,severity_mix,hotspot_recurrence,cleanup_completion_lead_time',
            'region' => 'nullable|string|max:255',
            'horizon' => 'nullable|integer|in:7,30,90',
            'cleanup_intensity' => 'nullable|numeric|min:0.1|max:5',
            'intervention_delay_days' => 'nullable|integer|min:0|max:30',
        ]);

        $forecast = $this->forecastService->forecast($validated);

        return response()->json($forecast);
    }

    public function kpis(): JsonResponse
    {
        return response()->json([
            'kpis' => $this->forecastService->kpis(),
            'horizons' => [7, 30, 90],
        ]);
    }
}
