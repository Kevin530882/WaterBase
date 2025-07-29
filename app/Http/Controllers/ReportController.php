<?php

namespace App\Http\Controllers;

use finfo;
use App\Models\Report;
use App\Enums\ReportStatus;
use App\Enums\SeverityLevel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class ReportController extends Controller
{

    public function index(Request $request)
    {
        $user = $request->user();
    
        \Log::info('Reports index called', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'user_area' => $user->areaOfResponsibility ?? 'none'
        ]);
        
        // For now, let's return ALL reports to debug
        $reports = Report::with(['user:id,firstName,lastName,email'])
                        ->orderBy('created_at', 'desc')
                        ->get();
        
        \Log::info('Found reports', [
            'count' => $reports->count(),
            'first_few' => $reports->take(3)->map(function($report) {
                return [
                    'id' => $report->id,
                    'address' => $report->address,
                    'status' => $report->status,
                    'latitude' => $report->latitude,
                    'longitude' => $report->longitude
                ];
            })->toArray()
        ]);
        
        return response()->json($reports);
    }
    
    public function store(Request $request)
    {
        $reportsValidated = $request->validate([
            'title'=> 'required|string|max:255|min:1',
            'content'=> 'required|string',
            'address'=> 'required|string',
            'latitude'=> 'required|numeric',
            'longitude'=> 'required|numeric',
            'pollutionType'=> 'required|string',
            'status'=> ['required', new enum(ReportStatus::class)],
            'image'=> 'required|string',
            'severityByUser'=> ['required', new enum(SeverityLevel::class)],
            'user_id'=> 'required|integer',
        ]);
            
        $imageValidated = $this->verifyImage($request->image);

        Report::create(array_merge($reportsValidated, ['severityByAI' => $request->severityByAI, 'severityPercentage' => $request->severityPercentage, 'ai_confidence' => $request->ai_confidence]));
        return response()->json(['success'=> 'Report Created Successfully', 'status' => 'success', 'imagething' => $imageValidated], 200);
    }

    public function show(string $id)
    {
        try {
            $report = Report::with('user')->findOrFail($id);
            return response()->json($report);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Report not found'], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $report = Report::findOrFail($id);
            $reportsValidated = $request->validate([
                'title'=> 'required|string|max:255|min:1',
                'content'=> 'required|string',
                'address'=> 'required|string',
                'latitude'=> 'required|numeric',
                'longitude'=> 'required|numeric',
                'pollutionType'=> 'required|string',
                'status'=> ['required', new Enum(ReportStatus::class)],
                'image'=> 'required|string',
                'severityByUser'=> ['required', new Enum(SeverityLevel::class)],
                'user_id'=> 'required|integer|exists:users,id',
            ]);

            $report->update($reportsValidated);
            return response()->json(['success'=> 'Report Updated Successfully'], status: 200);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Report not found'], 404);
        }
    }

    public function destroy(string $id)
    {
        try 
        {
            $report = Report::findOrFail($id);
            $report->delete();
            return response()->json(['success' => 'Report Deleted Successfully'], 200);
        } 
        catch (ModelNotFoundException $e) 
        {
            return response()->json(['message' => 'Report not found'], 404);
        }        
    }

    // Add this new method for updating report status
    public function updateStatus(Request $request, string $id)
    {
        try {
            $report = Report::findOrFail($id);

            $validated = $request->validate([
                'status' => ['required', new Enum(ReportStatus::class)]
            ]);

            $report->status = $validated['status'];
            $report->save();
            
            return response()->json([
                'success' => 'Report status updated successfully',
                'report' => $report
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Report not found'], 404);
        }
    }

    // Add this new method for bulk status updates
    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'report_ids' => 'required|array',
            'report_ids.*' => 'required|integer|exists:reports,id',
            'status' => 'required|in:pending,verified,declined'
        ]);

        try {
            $updated = Report::whereIn('id', $validated['report_id'])
                ->update(['status' => $validated['status']]);
            
            return response()->json([
                'success' => "Successfully updated {$updated} reports",
                'updated_count' => $updated
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update reports',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getReportsByArea(Request $request, $area = null)
    {
        $user = $request->user();
        
        $query = Report::with(['user:id,firstName,lastName,email'])
                    ->where('status', 'verified');
        
        // If user has area of responsibility and is not admin, filter by area
        if ($user->areaOfResponsibility && $user->role !== 'admin') {
            $userArea = $user->areaOfResponsibility;
            
            $query->where(function($q) use ($userArea) {
                $q->where('address', 'LIKE', "%{$userArea}%")
                ->orWhere('address', 'LIKE', "%".explode(',', $userArea)[0]."%");
            });
        }
        
        $reports = $query->orderBy('created_at', 'desc')->get();
        
        return response()->json($reports);
    }
    private function verifyImage(string $imageString){
                // Store the uploaded image
        if (strpos($imageString, 'data:image/') === 0) {
            $base64_string = substr($imageString, strpos($imageString, ',') + 1);
        }
        $decoded_image_data = base64_decode($base64_string);

        $fileName = uniqid() . '.jpeg';

        //$imagePath = Storage::disk("public")->putFileAs("uploads", $decoded_image_data, $fileName);
        Storage::disk('public')->put("uploads/{$fileName}", $decoded_image_data);

        $imageFullPath = Storage::disk('public')->path("uploads/{$fileName}");
        $python = base_path('python_environment/Scripts/python.exe'); // Windows venv
        $script = base_path('scripts/check_location.py');
        $cmd = "\"$python\" \"$script\" \"$imageFullPath\"";
        $output = shell_exec($cmd);
        Log::info('Python output: ' . $output);

        if (!$output) {
            return ['error' => 'Error processing image. No output from Python script.'];
        }

        // Extract the last line of the output (should be the JSON)
        $lines = explode("\n", trim($output));
        $json_line = end($lines);
        Log::info('Extracted JSON line: ' . $json_line); // Log this for debugging

        // Decode the JSON response from the Python script
        $location = json_decode($json_line, true);

        // Check if JSON decoding failed
        if ($location === null) {
            return ['error' => 'Invalid JSON output from Python script.', 'output' => $json_line];
        }

        return $location;

    }
}
