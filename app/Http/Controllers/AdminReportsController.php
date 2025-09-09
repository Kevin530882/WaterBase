<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;


class AdminReportsController extends Controller
{
    public function getAllReports(Request $request)
    {
        try {
            $query = Report::with(['user', 'verifiedBy']);

            // Apply existing filters
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }
            if ($request->has('type') && $request->type !== 'all') {
                $query->where('pollutionType', $request->type);
            }
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'LIKE', "%{$search}%")
                      ->orWhere('address', 'LIKE', "%{$search}%")
                      ->orWhereHas('user', function ($q) use ($search) {
                          $q->where('firstName', 'LIKE', "%{$search}%")
                            ->orWhere('lastName', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Apply advanced filters
            if ($request->has('severityByUser') && $request->severityByUser !== 'all') {
                $query->where('severityByUser', $request->severityByUser);
            }
            if ($request->has('severityByAI') && $request->severityByAI !== 'all') {
                $query->where('severityByAI', $request->severityByAI);
            }
            if ($request->has('aiConfidenceMin')) {
                $query->where('ai_confidence', '>=', $request->aiConfidenceMin);
            }
            if ($request->has('aiConfidenceMax')) {
                $query->where('ai_confidence', '<=', $request->aiConfidenceMax);
            }
            if ($request->has('dateFrom')) {
                $query->whereDate('created_at', '>=', $request->dateFrom);
            }
            if ($request->has('dateTo')) {
                $query->whereDate('created_at', '<=', $request->dateTo);
            }
            if ($request->has('submitter')) {
                $query->whereHas('user', function ($q) use ($request) {
                    $q->whereRaw("CONCAT(firstName, ' ', lastName) LIKE ?", ['%' . $request->submitter . '%']);
                });
            }
            if ($request->has('verifier')) {
                $query->whereHas('verifiedBy', function ($q) use ($request) {
                    $q->whereRaw("CONCAT(firstName, ' ', lastName) LIKE ?", ['%' . $request->verifier . '%']);
                });
            }
            if ($request->has('aiVerified') && $request->aiVerified !== 'all') {
                $query->where('ai_verified', $request->aiVerified === 'true' ? 1 : 0);
            }

            // Paginate the results
            $reports = $query->latest()->paginate(10);

            return response()->json($reports, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch reports: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch reports',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    public function getReportStats(Request $request)
    {
        try {
            $stats = [
                'total' => Report::count(),
                'verified' => Report::where('status', 'verified')->count(),
                'pending' => Report::where('status', 'pending')->count(),
                'rejected' => Report::where('status', 'declined')->count(),
            ];

            return response()->json($stats, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch report stats: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch report stats',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
