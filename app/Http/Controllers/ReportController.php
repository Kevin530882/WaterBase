<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\Rules\Enum;
use App\Models\Report;
use App\Enums\ReportStatus;
use App\Enums\SeverityLevel;
class ReportController extends Controller
{

    public function index()
    {
        try {
            $reports = Report::with('user')->orderBy('created_at', 'desc')->get();
            return response()->json($reports);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'No reports found'], 404);
        }
    }

    public function store(Request $request)
    {
        $reportsValidated = $request->validate([
            'title'=> 'required|string|max:255|min:1',
            'content'=> 'required|string',
            'address'=> 'required|string',
            'latitude'=> 'required|decimal:1,11',
            'longitude'=> 'required|decimal:1,11',
            'pollutionType'=> 'required|string',
            'status'=> ['required', new enum(ReportStatus::class)],
            'image'=> 'required|string',
            'severityByUser'=> ['required', new enum(SeverityLevel::class)],
            'user_id'=> 'required|integer',
        ]);

            Report::create($reportsValidated);
            return response()->json(['success'=> 'Report Created Successfully'], 200);
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
                'latitude'=> 'required|decimal:1,11',
                'longitude'=> 'required|decimal:1,11',
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
}
