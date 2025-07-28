<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DetectPollutionController extends Controller
{
    public function predict(Request $request)
    {
        set_time_limit(600);
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        // Store the uploaded image
        $file = $request->image;
        $fileName = $file->getClientOriginalName();
        $imagePath = Storage::disk("public")->putFileAs("uploads", $file, $fileName);

        $imageFullPath = Storage::disk('public')->path($imagePath);
        $python = base_path('python_environment/Scripts/python.exe'); // Windows venv
        $script = base_path('scripts/predict_pollution.py');
        $cmd = "\"$python\" \"$script\" \"$imageFullPath\"";
        $output = shell_exec($cmd);
        Log::info('Python output: ' . $output);

        if (!$output) {
            return response()->json(['error' => 'Error processing image. No output from Python script.'], 400);
        }

        // Extract the last line of the output (should be the JSON)
        $lines = explode("\n", trim($output));
        $json_line = end($lines);
        Log::info('Extracted JSON line: ' . $json_line); // Log this for debugging

        // Decode the JSON response from the Python script
        $predictions = json_decode($json_line, true);

        // Check if JSON decoding failed
        if ($predictions === null) {
            return response()->json(['error' => 'Invalid JSON output from Python script.', 'output' => $json_line], 400);
        }

        return response()->json($predictions, 200);
    }
}