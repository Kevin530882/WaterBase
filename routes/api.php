<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\DetectPollutionController;
use App\Http\Controllers\ReportLocationController;

Route::post('/login', [UserController::class, 'login']);
Route::post('/register', [UserController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [UserController::class, 'logout']);

    // Event routes
    Route::apiResource('events', EventController::class);
    Route::post('/events/{id}/join', [EventController::class, 'join']);
    Route::get('/user/events', [EventController::class, 'getUserEvents']);

    // Report routes - specific routes MUST come before resourceful routes
    Route::get('/reports/accessible', [ReportLocationController::class, 'getAccessibleReports']);
    Route::patch('/reports/{report}/status', [ReportController::class, 'updateStatus']);
    Route::patch('/reports/bulk-status', [ReportController::class, 'bulkUpdateStatus']);
    Route::get('/reports/area/{area}', [ReportController::class, 'getReportsByArea']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Resourceful route (must come after specific routes)
    Route::apiResource('reports', ReportController::class);

    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::get('/user/stats', [UserController::class, 'getStats']);

    // Location-based report access routes
    Route::get('/report-groups/accessible', [ReportLocationController::class, 'getAccessibleReportGroups']);
    Route::get('/location/statistics', [ReportLocationController::class, 'getGroupingStatistics']);
    Route::get('/report-groups/needs-cleanup', [ReportLocationController::class, 'getGroupsNeedingCleanup']);
    Route::get('/location/locations', [ReportLocationController::class, 'getLocations']);
    Route::post('/location/validate-aor', [ReportLocationController::class, 'validateAreaOfResponsibility']);
    Route::post('/location/geocode', [ReportLocationController::class, 'geocodeCoordinates']);
    Route::post('/location/nearby-groups', [ReportLocationController::class, 'getNearbyGroups']);

    Route::post('/predict', [DetectPollutionController::class, 'predict']);
});
