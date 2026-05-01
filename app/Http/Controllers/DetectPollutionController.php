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
            'image' => 'required|image|mimes:jpeg,png,jpg|max:10120',
        ]);

        // Store the uploaded image
        $file = $request->image;
        $fileName = $file->getClientOriginalName();
        $imagePath = Storage::disk("public")->putFileAs("uploads", $file, $fileName);

        $imageFullPath = Storage::disk('public')->path($imagePath);

        $python = base_path('python_environment/Scripts/python.exe'); // Windows venv
        $script = base_path('scripts/predict_pollution.py');
        $workingDir = base_path(); // Change to project root so Python can find vision_models
        $cmd = "cd /d \"$workingDir\" && \"$python\" \"$script\" \"$imageFullPath\"";
        Log::info('Python command: ' . $cmd);
        $output = shell_exec($cmd);
        Log::info('Python output: ' . $output);

        if (!$output) {
            return response()->json(['error' => 'Error processing image. No output from Python script.'], 400);
        }

        // Extract the last line of the output (should be the JSON)
        $lines = explode("\n", trim($output));
        $json_line = end($lines);
        Log::info('Extracted JSON line: ' . $json_line); // Log this for debugging
        Log::info('Full Python output: ' . $output); // Log full output for debugging

        // Decode the JSON response from the Python script
        $predictions = json_decode($json_line, true);

        // Check if JSON decoding failed
        if ($predictions === null) {
            Log::error('JSON decode failed for: ' . $json_line);
            return response()->json(['error' => 'Invalid JSON output from Python script.', 'output' => $json_line], 400);
        }

        // Ensure predictions has required keys with defaults
        $predictions = array_merge([
            'severity_level' => 'medium',
            'pollution_percentage' => 0,
            'water_predictions' => [],
            'trash_predictions' => [],
            'pollution_predictions' => [],
            'overall_confidence' => 0,
            'has_pollution' => false
        ], $predictions);

        Log::info('Final predictions after defaults: ' . json_encode($predictions));

        // Compute verification purely by closeness of user vs AI severity level
        // Confidence and other gates are handled by backend auto-approval rules, not here
        $userSeverity = $request->severityByUser;
        
        // Debug logging
        Log::info('AI Verification Debug', [
            'userSeverity' => $userSeverity,
            'aiSeverity' => $predictions['severity_level'],
            'pollutionPercentage' => $predictions['pollution_percentage'],
            'isEmpty' => empty($userSeverity),
            'isMedium' => $userSeverity === 'medium'
        ]);
        
        // If user severity is 'medium' (default) or empty, this is likely a Quick Photo flow
        // where the user hasn't specified severity yet, so we consider it verified
        if (empty($userSeverity) || $userSeverity === 'medium') {
            $verified = true;
            Log::info('Quick Photo flow - setting verified to true');
        } else {
            // For Detailed Report flow, compare user's specified severity with AI's severity
            $verified = $this->isCloseMatchAiPrediction($userSeverity, $predictions['severity_level'], $predictions['pollution_percentage']);
            Log::info('Detailed Report flow - verification result', ['verified' => $verified]);
        }

        return response()->json([
            'predictions' => $predictions,
            'ai_verified' => $verified
        ], 200);
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

        $u = strtolower(trim($userSev));
        $a = strtolower(trim($aiSev));

        $i = array_search($u, $levels, true);
        $j = array_search($a, $levels, true);
        
        // Debug logging for severity comparison
        Log::info('Severity comparison', [
            'userSev' => $userSev,
            'aiSev' => $aiSev,
            'userSevLower' => $u,
            'aiSevLower' => $a,
            'userIndex' => $i,
            'aiIndex' => $j
        ]);

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