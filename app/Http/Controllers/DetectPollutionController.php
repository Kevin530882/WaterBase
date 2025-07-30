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
        ini_set('memory_limit', '256M');
        $request->validate([
            'image' => 'required',
        ]);

        $imageString = $request->image;
        if (strpos($imageString, 'data:image/') === 0) {
            $base64_string = substr($imageString, strpos($imageString, ',') + 1);
        }
        $decoded_image_data = base64_decode($base64_string);

        $fileName = uniqid() . '.jpeg';

        //$imagePath = Storage::disk("public")->putFileAs("uploads", $decoded_image_data, $fileName);
        Storage::disk('public')->put("uploads/{$fileName}", $decoded_image_data);

        $imageFullPath = Storage::disk('public')->path("uploads/{$fileName}");

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

        $verified = False;
        if($predictions['total_water_area'] > 0){
            if($predictions['overall_confidence'] > 69){
                $verified = $this->isCloseMatchAiPrediction($request->severityByUser, $predictions['severity_level'], $predictions['pollution_percentage']);
            }
        }
            
            
        return response()->json(array_merge([$predictions,'ai_verified' => $verified]), 200);
    }

    
    private function isCloseMatchAiPrediction(string $userSev, string $aiSev, float $pollutionPct, bool $allowNeighbor = true, float $pctTolerance = 10.0): bool {
        // 1) Define the ordered levels and their pct‐ranges
        $levels = ['low','medium','high','critical'];
        $ranges = [
            'low'      => [  0.0,  25.0],
            'medium'   => [ 25.0,  50.0],
            'high'     => [ 50.0,  75.0],
            'critical' => [ 75.0, 100.0],
        ];

        $u = strtolower($userSev);
        $a = strtolower($aiSev);

        $i = array_search($u, $levels, true);
        $j = array_search($a, $levels, true);

        // 2) Exact match
        if ($i === $j) {
            return true;
        }

        // 3) Neighbor check
        if ($allowNeighbor && abs($i - $j) === 1) {
            // See if pollutionPct actually sits in or near the user‐declared range
            [$min, $max] = $ranges[$u];
            if ($pollutionPct >= $min && $pollutionPct <= $max) {
                return true;
            }
            // It’s outside by more than tolerance?
            if ($pollutionPct < $min - $pctTolerance || $pollutionPct > $max + $pctTolerance) {
                return  false;
            }
            // It’s just a little outside tolerance—still accept
            return true;
        }

        // 4) Otherwise it’s too far apart
        return false;
    }
}