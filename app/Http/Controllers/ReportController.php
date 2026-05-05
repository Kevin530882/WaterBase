<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\Event;
use App\Enums\ReportStatus;
use App\Enums\SeverityLevel;
use App\Services\BadgeEvaluationService;
use App\Services\GeographicService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use App\Models\SystemSetting;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Validator;

class ReportController extends Controller
{
    protected GeographicService $geographicService;
    protected NotificationService $notificationService;
    protected BadgeEvaluationService $badgeEvaluationService;

    public function __construct(
        GeographicService $geographicService,
        NotificationService $notificationService,
        BadgeEvaluationService $badgeEvaluationService,
    ) {
        $this->geographicService = $geographicService;
        $this->notificationService = $notificationService;
        $this->badgeEvaluationService = $badgeEvaluationService;
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
                $annotatedStoragePath = 'uploads/' . $annotatedFileName;
                $annotatedImagePath = Storage::url($annotatedStoragePath);

                // Annotated image can be generated asynchronously; keep submission successful if it is not available yet.
                if (!Storage::disk('public')->exists($annotatedStoragePath)) {
                    Log::warning('Annotated image not found during report submission. Falling back to original image.', [
                        'file' => $fileName,
                        'user_id' => $request->user_id,
                    ]);
                    $annotatedImagePath = $imagePath;
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
                        $reportsValidated['auto_approved'] = true;
                        $reportsValidated['auto_approved_at'] = now();
                    } else {
                        $reportsValidated['status'] = 'pending';
                        $reportsValidated['auto_approved'] = false;
                    }
                } else {
                    $reportsValidated['status'] = 'pending';
                    $reportsValidated['auto_approved'] = false;
                }

                $report = Report::create(array_merge($reportsValidated, [
                    'image' => $imagePath,
                    'ai_annotated_image' => $annotatedImagePath,
                ]));

                // Link report to active event if within ~100m proximity
                $activeEvent = Event::where('status', 'active')
                    ->whereBetween('latitude', [$report->latitude - 0.001, $report->latitude + 0.001])
                    ->whereBetween('longitude', [$report->longitude - 0.001, $report->longitude + 0.001])
                    ->orderByRaw('SQRT(POW(latitude - ?, 2) + POW(longitude - ?, 2))', [$report->latitude, $report->longitude])
                    ->first();

                if ($activeEvent) {
                    $report->event_id = $activeEvent->id;
                    $report->save();

                    Log::info('Report linked to active event', [
                        'report_id' => $report->id,
                        'event_id' => $activeEvent->id,
                    ]);
                }

                $this->notificationService->notifyReportStatusChanged(
                    report: $report,
                    oldStatus: null,
                    newStatus: (string) $report->status,
                    actor: $request->user(),
                    extra: ['source' => 'report_created']
                );

                $newBadges = $this->badgeEvaluationService->evaluateAndAward($request->user());
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
                'success' => 'Report queued for processing',
                'status' => 'success',
                'message' => 'Your submission is being processed. We will notify you once verification updates are available.',
                'report' => $report,
                'new_badges' => $newBadges,
            ], 202);

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

    public function bulkUpload(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $file = $request->file('csv_file');
        $handle = fopen($file->getRealPath(), 'r');

        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            return response()->json(['message' => 'CSV file is empty'], 422);
        }

        $headers = array_map('strtolower', array_map('trim', $headers));
        $expectedHeaders = [
            'title', 'content', 'address', 'latitude', 'longitude',
            'pollutiontype', 'severitybyuser', 'water_body_name',
            'temperature_celsius', 'ph_level', 'turbidity_ntu',
            'total_dissolved_solids_mgl', 'sampling_date',
        ];

        $headerDiff = array_diff($expectedHeaders, $headers);
        if (!empty($headerDiff)) {
            fclose($handle);
            return response()->json([
                'message' => 'Invalid CSV headers',
                'missing_headers' => array_values($headerDiff),
                'expected' => $expectedHeaders,
                'received' => $headers,
            ], 422);
        }

        $headerMap = array_flip($headers);
        $validTypes = ['Industrial Waste', 'Chemical Pollution', 'Oil Spill', 'Plastic Pollution', 'Sewage Discharge', 'Unnatural Color', 'Clean', 'Other'];
        $validSeverity = ['low', 'medium', 'high', 'critical'];
        $errors = [];
        $validRows = [];
        $rowNumber = 1;
        $maxErrors = 50;

        $pollutionTypeMap = [
            'industrial waste' => 'Industrial Waste',
            'chemical pollution' => 'Chemical Pollution',
            'oil spill' => 'Oil Spill',
            'plastic pollution' => 'Plastic Pollution',
            'sewage discharge' => 'Sewage Discharge',
            'unnatural color' => 'Unnatural Color',
            'clean' => 'Clean',
            'other' => 'Other',
        ];

        while (($row = fgetcsv($handle)) !== false && count($errors) < $maxErrors) {
            $rowNumber++;

            if (count($row) < count($headers)) {
                $errors[] = ['row' => $rowNumber, 'field' => 'row', 'message' => 'Row has fewer columns than header'];
                continue;
            }

            $data = [];
            foreach ($headers as $index => $header) {
                $data[$header] = isset($row[$index]) ? trim($row[$index]) : '';
            }

            $rowErrors = [];

            // Required fields
            $requiredFields = ['title', 'content', 'address', 'latitude', 'longitude', 'pollutiontype', 'severitybyuser'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => $field, 'message' => "Required field '$field' is empty"];
                }
            }

            // Latitude validation
            if (!empty($data['latitude'])) {
                if (!is_numeric($data['latitude'])) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'latitude', 'message' => 'Latitude must be a number'];
                } else {
                    $lat = (float) $data['latitude'];
                    if ($lat < -90 || $lat > 90) {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'latitude', 'message' => 'Latitude must be between -90 and 90'];
                    }
                }
            }

            // Longitude validation
            if (!empty($data['longitude'])) {
                if (!is_numeric($data['longitude'])) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'longitude', 'message' => 'Longitude must be a number'];
                } else {
                    $lng = (float) $data['longitude'];
                    if ($lng < -180 || $lng > 180) {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'longitude', 'message' => 'Longitude must be between -180 and 180'];
                    }
                }
            }

            // pollutionType validation
            if (!empty($data['pollutiontype'])) {
                $typeKey = strtolower($data['pollutiontype']);
                if (!isset($pollutionTypeMap[$typeKey])) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'pollutiontype', 'message' => "Invalid pollution type '{$data['pollutiontype']}'. Must be one of: " . implode(', ', $validTypes)];
                }
            }

            // severityByUser validation
            if (!empty($data['severitybyuser'])) {
                if (!in_array(strtolower($data['severitybyuser']), $validSeverity)) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'severitybyuser', 'message' => "Invalid severity '{$data['severitybyuser']}'. Must be one of: " . implode(', ', $validSeverity)];
                }
            }

            // Water quality params numeric validation
            $numericFields = ['temperature_celsius', 'ph_level', 'turbidity_ntu', 'total_dissolved_solids_mgl'];
            foreach ($numericFields as $field) {
                if (!empty($data[$field]) && !is_numeric($data[$field])) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => $field, 'message' => "Field '$field' must be a number"];
                }
            }

            // sampling_date validation
            if (!empty($data['sampling_date'])) {
                $formats = ['Y-m-d', 'm/d/Y', 'd-m-Y', 'd/m/Y'];
                $parsed = false;
                foreach ($formats as $format) {
                    $d = \DateTime::createFromFormat($format, $data['sampling_date']);
                    if ($d && $d->format($format) === $data['sampling_date']) {
                        $data['sampling_date'] = $d->format('Y-m-d');
                        $parsed = true;
                        break;
                    }
                }
                if (!$parsed) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'sampling_date', 'message' => "Invalid date format '{$data['sampling_date']}'. Accepted formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY"];
                }
            }

            if (!empty($rowErrors)) {
                $errors = array_merge($errors, $rowErrors);
                continue;
            }

            $normalizedType = isset($pollutionTypeMap[strtolower($data['pollutiontype'])])
                ? $pollutionTypeMap[strtolower($data['pollutiontype'])]
                : $data['pollutiontype'];

            $validRows[] = [
                'title' => $data['title'],
                'content' => $data['content'],
                'address' => $data['address'],
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
                'pollutionType' => $normalizedType,
                'severityByUser' => strtolower($data['severitybyuser']),
                'severityByAI' => 'low',
                'ai_confidence' => 0,
                'severityPercentage' => 0,
                'ai_verified' => false,
                'water_body_name' => !empty($data['water_body_name']) ? $data['water_body_name'] : null,
                'temperature_celsius' => !empty($data['temperature_celsius']) ? $data['temperature_celsius'] : null,
                'ph_level' => !empty($data['ph_level']) ? $data['ph_level'] : null,
                'turbidity_ntu' => !empty($data['turbidity_ntu']) ? $data['turbidity_ntu'] : null,
                'total_dissolved_solids_mgl' => !empty($data['total_dissolved_solids_mgl']) ? $data['total_dissolved_solids_mgl'] : null,
                'sampling_date' => !empty($data['sampling_date']) ? $data['sampling_date'] : null,
                'source' => 'csv_upload',
                'user_id' => $request->user()->id,
            ];
        }

        fclose($handle);

        if (!empty($errors)) {
            return response()->json([
                'message' => 'Validation errors found in CSV',
                'errors' => $errors,
                'total_rows' => $rowNumber - 1,
                'imported' => 0,
            ], 422);
        }

        // Check csv_auto_approve_enabled setting
        $settings = SystemSetting::query()->latest()->first();
        $autoApprove = $settings && $settings->csv_auto_approve_enabled;

        $now = now();
        $insertData = array_map(function ($row) use ($autoApprove, $now) {
            if ($autoApprove) {
                $row['status'] = 'verified';
                $row['auto_approved'] = true;
                $row['auto_approved_at'] = $now;
            } else {
                $row['status'] = 'pending';
                $row['auto_approved'] = false;
            }
            $row['created_at'] = $now;
            $row['updated_at'] = $now;
            return $row;
        }, $validRows);

        Report::insert($insertData);

        return response()->json([
            'message' => 'CSV imported successfully',
            'imported' => count($validRows),
            'errors' => [],
            'total_rows' => $rowNumber - 1,
            'auto_approved' => $autoApprove,
        ]);
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
