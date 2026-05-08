<?php

namespace App\Http\Controllers;

use App\Services\AreaWbsiService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MapWbsiController extends Controller
{
    public function __construct(private readonly AreaWbsiService $areaWbsiService)
    {
    }

    public function areas(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $areas = $this->areaWbsiService->areas($from, $to, $this->bbox($request));

        return response()->json([
            'areas' => $areas,
            'national_summary' => $this->areaWbsiService->nationalSummary($areas),
        ]);
    }

    private function dateRange(Request $request): array
    {
        return [
            $request->filled('from') ? Carbon::parse($request->input('from'))->startOfDay() : null,
            $request->filled('to') ? Carbon::parse($request->input('to'))->endOfDay() : null,
        ];
    }

    private function bbox(Request $request): ?array
    {
        if (!$request->filled('bbox')) {
            return null;
        }

        $values = array_map('floatval', explode(',', (string) $request->input('bbox')));

        return count($values) === 4 ? $values : null;
    }
}
