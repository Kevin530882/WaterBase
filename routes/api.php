<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\GeographicController;
use App\Http\Controllers\DetectPollutionController;
use App\Http\Controllers\AdminDashboardController;

Route::post('/login', [UserController::class, 'login']);
Route::post('/register', [UserController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [UserController::class, 'logout']);

    // Event routes
    Route::apiResource('events', EventController::class);
    Route::post('/events/{id}/join', [EventController::class, 'join']);
    Route::get('/user/events', [EventController::class, 'getUserEvents']);

    // Report routes - specific routes MUST come before resourceful routes
    Route::get('/reports/accessible', [ReportController::class, 'accessible']);
    Route::patch('/reports/{report}/status', [ReportController::class, 'updateStatus']);
    Route::patch('/reports/bulk-status', [ReportController::class, 'bulkUpdateStatus']);
    Route::get('/reports/area/{area}', [ReportController::class, 'getReportsByArea']);
    Route::post('/reports/verify-image', [ReportController::class, 'verifyImage']);
    Route::post('/reports/organizations', [ReportController::class, 'getOrganizationsForReport']);

    // Geographic routes
    Route::post('/geographic/register-area', [GeographicController::class, 'registerAreaOfResponsibility']);
    Route::post('/geographic/update-my-area', [GeographicController::class, 'updateMyArea']);
    Route::post('/geographic/find-orgs', [GeographicController::class, 'findOrgsForReport']);
    Route::get('/geographic/organizations', [GeographicController::class, 'getAllOrgsWithBoundaries']);
    Route::post('/geographic/test-point', [GeographicController::class, 'testPointInArea']);
    Route::post('/geographic/geocode', [GeographicController::class, 'geocodeAddress']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Resourceful route (must come after specific routes)
    Route::apiResource('reports', ReportController::class);

    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::get('/user/stats', [UserController::class, 'getStats']);

    Route::post('/predict', [DetectPollutionController::class, 'predict']);

    Route::get('/admin/reports/pending',[AdminDashboardController::class,'getPendingReports']);
    Route::put('/admin/reports/{report}/status', [AdminDashboardController::class, 'updateStatus']);

    Route::get('/admin/users', [AdminDashboardController::class,'getExistingUsers']);
    Route::put('/admin/users/{user}', [AdminDashboardController::class,'editExistingUser']);
    Route::delete('/admin/users/{user}', [AdminDashboardController::class, 'deleteUser']);
});
