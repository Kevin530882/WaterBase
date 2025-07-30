<?php

namespace App\Http\Controllers;

use App\Services\ReportAccessControlService;
use App\Services\ReportGroupingService;
use App\Services\LocationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReportLocationController extends Controller
{
    private ReportAccessControlService $accessControlService;
    private ReportGroupingService $groupingService;
    private LocationService $locationService;

    public function __construct(
        ReportAccessControlService $accessControlService,
        ReportGroupingService $groupingService,
        LocationService $locationService
    ) {
        $this->accessControlService = $accessControlService;
        $this->groupingService = $groupingService;
        $this->locationService = $locationService;
    }

    /**
     * Get reports accessible to the authenticated user
     */
    public function getAccessibleReports(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Simple test first - return all reports for debugging
            $reports = \App\Models\Report::with(['user'])
                ->latest()
                ->paginate(20);

            return response()->json([
                'reports' => $reports,
                'user_area' => $user->areaOfResponsibility ?? 'No area assigned',
                'user_id' => $user->id,
                'debug' => 'Simple endpoint working'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error in getAccessibleReports: ' . $e->getMessage());
            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Get report groups accessible to the authenticated user
     */
    public function getAccessibleReportGroups(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $reportGroups = $this->accessControlService->getAccessibleReportGroups($user)
            ->with(['reports', 'cleanupEvent'])
            ->paginate(20);

        return response()->json([
            'report_groups' => $reportGroups,
            'user_area' => $user->areaOfResponsibility,
        ]);
    }

    /**
     * Get grouping statistics
     */
    public function getGroupingStatistics(): JsonResponse
    {
        $stats = $this->groupingService->getGroupingStatistics();
        $locationStats = $this->accessControlService->getLocationStatistics();

        return response()->json([
            'grouping_stats' => $stats,
            'location_stats' => $locationStats,
        ]);
    }

    /**
     * Get groups that need cleanup events
     */
    public function getGroupsNeedingCleanup(): JsonResponse
    {
        $groups = $this->groupingService->getGroupsNeedingCleanup();

        return response()->json([
            'groups_needing_cleanup' => $groups,
        ]);
    }

    /**
     * Get locations at a specific level
     */
    public function getLocations(Request $request): JsonResponse
    {
        $level = $request->get('level', 'region');
        $parentLocation = $request->get('parent', []);

        $locations = $this->locationService->getLocationsAt($level, $parentLocation);

        return response()->json([
            'level' => $level,
            'locations' => $locations,
        ]);
    }

    /**
     * Validate area of responsibility
     */
    public function validateAreaOfResponsibility(Request $request): JsonResponse
    {
        $areaOfResponsibility = $request->get('area_of_responsibility');

        if (!$areaOfResponsibility) {
            return response()->json(['error' => 'Area of responsibility is required'], 400);
        }

        $validation = $this->accessControlService->validateAreaOfResponsibility($areaOfResponsibility);

        return response()->json($validation);
    }

    /**
     * Geocode coordinates to location
     */
    public function geocodeCoordinates(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $latitude = (float) $request->get('latitude');
        $longitude = (float) $request->get('longitude');

        $location = $this->locationService->geocodeCoordinates($latitude, $longitude);

        return response()->json([
            'coordinates' => [
                'latitude' => $latitude,
                'longitude' => $longitude,
            ],
            'location' => $location,
        ]);
    }

    /**
     * Get nearby report groups for a location
     */
    public function getNearbyGroups(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius_km' => 'numeric|min:0.1|max:50',
        ]);

        $latitude = (float) $request->get('latitude');
        $longitude = (float) $request->get('longitude');
        $radiusKm = (float) $request->get('radius_km', 5.0);

        $nearbyGroups = $this->groupingService->getNearbyGroups($latitude, $longitude, $radiusKm);

        return response()->json([
            'coordinates' => [
                'latitude' => $latitude,
                'longitude' => $longitude,
            ],
            'radius_km' => $radiusKm,
            'nearby_groups' => $nearbyGroups,
        ]);
    }
}
