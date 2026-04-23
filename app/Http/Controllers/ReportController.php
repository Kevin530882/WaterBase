<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Enums\ReportStatus;
use App\Enums\SeverityLevel;
use App\Services\GeographicService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use App\Models\SystemSetting;
use App\Services\NotificationService;

class ReportController extends Controller
{
    protected GeographicService $geographicService;
    protected NotificationService $notificationService;

    public function __construct(GeographicService $geographicService, NotificationService $notificationService)
    {
        $this->geographicService = $geographicService;
        $this->notificationService = $notificationService;
    }

    public function index(Request $request)
    {
        $user = $request->user();

        Log::info('Reports index called', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'user_area' => $user->areaOfResponsibility ?? 'none'
        ]);

        // Apply area filtering if user has area of responsibility
        $query = Report::with(['user:id,firstName,lastName,email']);

        if ($user->areaOfResponsibility) {
            Log::info('Applying area filtering', [
                'user_area' => $user->areaOfResponsibility,
                'total_reports_before_filter' => Report::count()
            ]);

            // Use geographic filtering if bounding box data is available
            if ($this->hasGeographicBounds($user)) {
                $query = $this->filterByGeographicBounds($query, $user);
                Log::info('Using geographic bounds filtering');
            } else {
                // Fallback to text-based filtering
                $query = $this->filterByAreaOfResponsibility($query, $user->areaOfResponsibility);
                Log::info('Using text-based area filtering (fallback)');
            }

            // Get count after filtering for debugging
            $filteredCount = clone $query;
            Log::info('Reports after area filtering', [
                'filtered_count' => $filteredCount->count(),
                'sample_addresses' => Report::take(3)->pluck('address')->toArray()
            ]);
        }

        $reports = $query->orderBy('created_at', 'desc')->get();

        Log::info('Found reports', [
            'count' => $reports->count(),
            'user_area' => $user->areaOfResponsibility,
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

    public function accessible(Request $request)
    {
        // This method provides the same functionality as index but with explicit "accessible" naming
        return $this->index($request);
    }

    public function all(Request $request)
    {
        // Get all reports without area filtering for map view
        $reports = Report::with(['user:id,firstName,lastName,email'])
            ->orderBy('created_at', 'desc')
            ->get();

        Log::info('Fetched all reports for map view', [
            'count' => $reports->count(),
            'user_id' => $request->user()->id
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
                'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:10120',
                'severityByUser' => ['required', new Enum(SeverityLevel::class)],
                'user_id' => 'required|integer|exists:users,id',
                'severityByAI' => ['required', new Enum(SeverityLevel::class)],
                'ai_verified' => 'boolean',
                'ai_confidence' => 'numeric',
                'severityPercentage' => 'numeric',
            ]);

            // Store image
            try {
                $file = $request->file('image');
                $fileName = $file->getClientOriginalName();
                // Store original image
                $path = Storage::disk('public')->putFileAs('uploads', $file, $fileName);
                $imagePath = Storage::url($path);

                if (!$imagePath) {
                    throw new \Exception('Failed to store image in uploads directory.');
                }

                // Construct annotated image path
                //$fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
                $fileNameWithoutExtension = pathinfo($fileName, PATHINFO_FILENAME);
                $annotatedFileName = $fileNameWithoutExtension . '_annotated.' . 'jpg';
                $annotatedImagePath = Storage::url('uploads/' . $annotatedFileName);

                // Verify if annotated image exists
                if (!Storage::disk('public')->exists('uploads/' . $annotatedFileName)) {
                    throw new \Exception('Annotated image does not exist.');
                }

            } catch (\Exception $e) {
                Log::error('Image storage failed: ' . $e->getMessage(), [
                    'file' => $fileName,
                    'user_id' => $request->user_id,
                ]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Failed to store image: ' . $e->getMessage(),
                ], 500);
            }

            // Create report
            try {
                // Apply auto-approval rules based on system settings
                $settings = SystemSetting::query()->latest()->first();
                // Normalize flags
                $reportsValidated['ai_verified'] = (bool)($reportsValidated['ai_verified'] ?? false);

                // Auto-approval requires both: feature enabled AND ai_confidence >= threshold AND ai_verified === true
                if ($settings && ($settings->auto_approve_enabled)) {
                    $aiConfidence = (float)($reportsValidated['ai_confidence'] ?? 0);
                    $meetsConfidence = $aiConfidence >= (int)$settings->auto_approve_threshold;
                    if ($meetsConfidence && $reportsValidated['ai_verified'] === true) {
                        $reportsValidated['status'] = 'verified';
                    } else {
                        $reportsValidated['status'] = 'pending';
                    }
                } else {
                    $reportsValidated['status'] = 'pending';
                }

                $report = Report::create(array_merge($reportsValidated, [
                    'image' => $imagePath,
                    'ai_annotated_image' => $annotatedImagePath,
                ]));

                $this->notificationService->notifyReportStatusChanged(
                    report: $report,
                    oldStatus: null,
                    newStatus: (string) $report->status,
                    actor: $request->user(),
                    extra: ['source' => 'report_created']
                );
            } catch (\Exception $e) {
                Log::error('Report creation failed: ' . $e->getMessage(), [
                    'validated_data' => $reportsValidated,
                    'image_path' => $imagePath,
                    'annotated_image_path' => $annotatedImagePath,
                ]);

                if ($request->user()) {
                    $this->notificationService->notifyReportProcessingFailed(
                        recipient: $request->user(),
                        reason: $e->getMessage(),
                        actor: $request->user()
                    );
                }

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
            $oldStatus = (string) $report->status;

            $validated = $request->validate([
                'status' => ['required', new Enum(ReportStatus::class)]
            ]);

            $report->status = $validated['status'];
            $report->save();

            if ($oldStatus !== (string) $report->status) {
                $this->notificationService->notifyReportStatusChanged(
                    report: $report,
                    oldStatus: $oldStatus,
                    newStatus: (string) $report->status,
                    actor: $request->user(),
                    extra: ['source' => 'single_status_update']
                );
            }

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
            $updated = 0;

            Report::query()->whereIn('id', $validated['report_ids'])->each(function (Report $report) use ($validated, $request, &$updated) {
                $oldStatus = (string) $report->status;
                if ($oldStatus === $validated['status']) {
                    return;
                }

                $report->status = $validated['status'];
                $report->save();
                $updated++;

                $this->notificationService->notifyReportStatusChanged(
                    report: $report,
                    oldStatus: $oldStatus,
                    newStatus: (string) $validated['status'],
                    actor: $request->user(),
                    extra: ['source' => 'bulk_status_update']
                );
            });

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
            // Use geographic filtering if bounding box data is available
            if ($this->hasGeographicBounds($user)) {
                $query = $this->filterByGeographicBounds($query, $user);
                Log::info('getReportsByArea: Using geographic bounds filtering');
            } else {
                // Fallback to text-based filtering
                $userArea = $user->areaOfResponsibility;
                $query->where(function ($q) use ($userArea) {
                    $q->where('address', 'LIKE', "%{$userArea}%")
                        ->orWhere('address', 'LIKE', "%" . explode(',', $userArea)[0] . "%");
                });
                Log::info('getReportsByArea: Using text-based area filtering (fallback)');
            }
        }

        $reports = $query->orderBy('created_at', 'desc')->get();

        return response()->json($reports);
    }

    public function verifyImage(Request $request)
    {
        try {
            // Store the uploaded image
            set_time_limit(600);
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg|max:5120',
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
                return response()->json(['error' => 'Error processing image. No output from Python script.'], 500);
            }

            // Extract the last line of the output (should be the JSON)
            $lines = explode("\n", trim($output));
            $json_line = end($lines);
            Log::info('Extracted JSON line: ' . $json_line); // Log this for debugging

            // Decode the JSON response from the Python script
            $location = json_decode($json_line, true);

            // Check if JSON decoding failed
            if ($location === null) {
                return response()->json(['error' => 'Invalid JSON output from Python script.', 'output' => $json_line], 500);
            }

            return response()->json($location);

        } catch (ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Image verification error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to verify image: ' . $e->getMessage()
            ], 500);
        }

    }

    /**
     * Check if user has geographic bounding box data
     */
    private function hasGeographicBounds($user): bool
    {
        return !is_null($user->bbox_south) &&
            !is_null($user->bbox_north) &&
            !is_null($user->bbox_west) &&
            !is_null($user->bbox_east);
    }

    /**
     * Filter reports using geographic bounding box
     */
    private function filterByGeographicBounds($query, $user)
    {
        return $query->where('latitude', '>=', $user->bbox_south)
            ->where('latitude', '<=', $user->bbox_north)
            ->where('longitude', '>=', $user->bbox_west)
            ->where('longitude', '<=', $user->bbox_east);
    }

    /**
     * Enhanced method to get organizations that should see a specific report
     */
    public function getOrganizationsForReport(Request $request)
    {
        try {
            $validated = $request->validate([
                'address' => 'required|string|max:500'
            ]);

            $result = $this->geographicService->findOrgsForReport($validated['address']);

            return response()->json($result);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error getting organizations for report', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Filter reports based on user's area of responsibility
     */
    private function filterByAreaOfResponsibility($query, $areaOfResponsibility)
    {
        // Parse the area of responsibility and extract meaningful location parts
        $areaOfResponsibility = strtoupper(trim($areaOfResponsibility));

        Log::info('Area filtering details', [
            'original_area' => $areaOfResponsibility
        ]);

        // Extract key location identifiers from the area of responsibility
        $locationParts = [];

        // Split by common delimiters
        $parts = preg_split('/[,\-]+/', $areaOfResponsibility);

        foreach ($parts as $part) {
            $part = trim($part);
            if (!empty($part)) {
                // Add the full part
                $locationParts[] = $part;

                // Also add individual words from the part (for cases like "METRO MANILA")
                $words = explode(' ', $part);
                foreach ($words as $word) {
                    $word = trim($word);
                    if (strlen($word) > 2 && !in_array($word, ['THE', 'OF', 'AND', 'REGION', 'CAPITAL', 'DISTRICT'])) {
                        $locationParts[] = $word;
                    }
                }
            }
        }

        // Remove duplicates and empty values
        $locationParts = array_unique(array_filter($locationParts));

        Log::info('Extracted location parts for filtering', [
            'location_parts' => $locationParts
        ]);

        if (empty($locationParts)) {
            return $query->whereRaw('1 = 0'); // No access
        }

        // Match if the address contains ANY of the location parts
        return $query->where(function ($q) use ($locationParts) {
            foreach ($locationParts as $locationPart) {
                if (!empty($locationPart)) {
                    $q->orWhereRaw('UPPER(address) LIKE ?', ['%' . $locationPart . '%']);
                }
            }
        });
    }
}
