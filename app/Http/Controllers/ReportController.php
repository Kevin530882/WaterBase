<?php

namespace App\Http\Controllers;

use finfo;
use Exception;
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
            'first_few' => $reports->take(3)->map(function ($report) {
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
      
        try {
            // Validate request data
            $reportsValidated = $request->validate([
                'title' => 'required|string|max:255|min:1',
                'content' => 'required|string',
                'address' => 'required|string',
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'pollutionType' => 'required|string',
                'status' => ['required', new Enum(ReportStatus::class)],
                'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
                'severityByUser' => ['required', new Enum(SeverityLevel::class)],
                'user_id' => 'required|integer|exists:users,id',
                'severityByAI' => ['required', new Enum(SeverityLevel::class)],
                'ai_verified' => 'boolean',
                'ai_confidence' => 'numeric',
                'severityPercentage' => 'numeric',
            ]);

            // Store image
            try {
                $image = $request->file('image');
                $imageName = uniqid() . '.' . $image->getClientOriginalExtension();
                $imagePath = $image->storeAs('uploads', $imageName, 'public');
                
                if (!$imagePath) {
                    throw new \Exception('Failed to store image in uploads directory.');
                }
            } catch (\Exception $e) {
                Log::error('Image storage failed: ' . $e->getMessage(), [
                    'file' => $request->file('image') ? $request->file('image')->getClientOriginalName() : null,
                    'user_id' => $request->user_id,
                ]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Failed to store image: ' . $e->getMessage(),
                ], 500);
            }

            // Create report
            try {
                $report = Report::create(array_merge($reportsValidated, [
                    'image' => $imagePath, // Store path, not blob
                ]));
            } catch (\Exception $e) {
                Log::error('Report creation failed: ' . $e->getMessage(), [
                    'validated_data' => $reportsValidated,
                    'image_path' => $imagePath,
                ]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Failed to create report: ' . $e->getMessage(),
                ], 500);
            }

            return response()->json([
                'success' => 'Report Created Successfully',
                'status' => 'success',
                'report' => $report,
            ], 200);

        } catch (ValidationException $e) {
            Log::warning('Validation failed for report creation: ' . json_encode($e->errors()), [
                'request_data' => $request->all(),
            ]);
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Unexpected error in report creation: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'status' => 'error',
                'message' => 'An unexpected error occurred. Please try again later.',
            ], 500);
        }
    
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
                'title' => 'required|string|max:255|min:1',
                'content' => 'required|string',
                'address' => 'required|string',
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
                'pollutionType' => 'required|string',
                'status' => ['required', new Enum(ReportStatus::class)],
                'image' => 'required|string',
                'severityByUser' => ['required', new Enum(SeverityLevel::class)],
                'user_id' => 'required|integer|exists:users,id',
                'ai_confidence' => 'numeric',
                'severityByAI' => new Enum(SeverityLevel::class),
                'severityPercentage' => 'numeric',
                'ai_verified' => 'required|boolean'
            ]);

            $report->update($reportsValidated);
            return response()->json(['success' => 'Report Updated Successfully'], status: 200);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Report not found'], 404);
        }
    }

    public function destroy(string $id)
    {
        try {
            $report = Report::findOrFail($id);
            $report->delete();
            return response()->json(['success' => 'Report Deleted Successfully'], 200);
        } catch (ModelNotFoundException $e) {
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
            $updated = Report::whereIn('id', $validated['report_ids'])
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

            $query->where(function ($q) use ($userArea) {
                $q->where('address', 'LIKE', "%{$userArea}%")
                    ->orWhere('address', 'LIKE', "%" . explode(',', $userArea)[0] . "%");
            });
        }

        $reports = $query->orderBy('created_at', 'desc')->get();

        return response()->json($reports);
    }
    private function verifyImage(Request $request){
                // Store the uploaded image
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
