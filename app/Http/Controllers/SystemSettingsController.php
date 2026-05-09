<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SystemSettingsController extends Controller
{
    public function get()
    {
        return response()->json(SystemSetting::current());
    }

    public function update(Request $request)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'auto_approve_enabled' => 'required|boolean',
            'auto_approve_threshold' => 'required|integer|min:0|max:100',
            'csv_auto_approve_enabled' => 'boolean',
            'wbsi_named_water_body_segment_radius_m' => 'required|integer|min:1|max:100000',
            'wbsi_ungrouped_proximity_radius_m' => 'required|integer|min:1|max:100000',
            'wbsi_sensor_assignment_radius_m' => 'required|integer|min:1|max:100000',
            'wbsi_sensor_weight' => 'required|numeric|min:0|max:1',
            'wbsi_report_weight' => 'required|numeric|min:0|max:1',
            'wbsi_freshwater_ph_min' => 'required|numeric|min:0|max:14',
            'wbsi_freshwater_ph_max' => 'required|numeric|min:0|max:14|gt:wbsi_freshwater_ph_min',
            'wbsi_freshwater_turbidity_ntu' => 'required|numeric|min:0.01|max:100000',
            'wbsi_freshwater_tds_mg_l' => 'required|numeric|min:0.01|max:100000',
            'wbsi_freshwater_temperature_min_celsius' => 'required|numeric|min:-50|max:100',
            'wbsi_freshwater_temperature_max_celsius' => 'required|numeric|min:-50|max:100|gt:wbsi_freshwater_temperature_min_celsius',
            'wbsi_marine_ph_min' => 'required|numeric|min:0|max:14',
            'wbsi_marine_ph_max' => 'required|numeric|min:0|max:14|gt:wbsi_marine_ph_min',
            'wbsi_marine_turbidity_ntu' => 'required|numeric|min:0.01|max:100000',
            'wbsi_marine_tds_mg_l' => 'required|numeric|min:0.01|max:100000',
            'wbsi_marine_temperature_min_celsius' => 'required|numeric|min:-50|max:100',
            'wbsi_marine_temperature_max_celsius' => 'required|numeric|min:-50|max:100|gt:wbsi_marine_temperature_min_celsius',
        ]);

        if (abs(((float) $validated['wbsi_sensor_weight'] + (float) $validated['wbsi_report_weight']) - 1.0) > 0.001) {
            return response()->json([
                'message' => 'The WBSI sensor and report weights must sum to 1.00.',
                'errors' => [
                    'wbsi_sensor_weight' => ['The WBSI sensor and report weights must sum to 1.00.'],
                    'wbsi_report_weight' => ['The WBSI sensor and report weights must sum to 1.00.'],
                ],
            ], 422);
        }

        $settings = SystemSetting::query()->latest()->first();
        if (!$settings) {
            $settings = new SystemSetting(SystemSetting::DEFAULTS);
        }
        $settings->fill($validated);
        $settings->save();

        return response()->json($settings);
    }

    public function updateRiskyUserThreshold(Request $request)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'risky_user_threshold' => 'required|integer|min:1|max:1000',
        ]);

        $settings = SystemSetting::current();
        $settings->risky_user_threshold = (int) $validated['risky_user_threshold'];
        $settings->save();

        return response()->json($settings);
    }
}

