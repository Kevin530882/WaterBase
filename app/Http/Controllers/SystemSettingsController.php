<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SystemSettingsController extends Controller
{
    public function get()
    {
        $settings = SystemSetting::query()->latest()->first();
        if (!$settings) {
            $settings = SystemSetting::create([
                'auto_approve_enabled' => false,
                'auto_approve_threshold' => 80,
            ]);
        }
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'auto_approve_enabled' => 'required|boolean',
            'auto_approve_threshold' => 'required|integer|min:0|max:100',
        ]);

        $settings = SystemSetting::query()->latest()->first();
        if (!$settings) {
            $settings = new SystemSetting();
        }
        $settings->fill($validated);
        $settings->save();

        return response()->json($settings);
    }
}


