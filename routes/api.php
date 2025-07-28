<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\DetectPollutionController;

Route::post('/login', [UserController::class, 'login']);
Route::post('/register', [UserController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [UserController::class, 'logout']);
    
    // Event routes
    Route::apiResource('events', EventController::class);
    
    // Report routes
    Route::apiResource('reports', ReportController::class);
    // Add these specific routes for report status updates
    Route::patch('/reports/{report}/status', [ReportController::class, 'updateStatus']);
    Route::patch('/reports/bulk-status', [ReportController::class, 'bulkUpdateStatus']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/predict', [DetectPollutionController::class, 'predict']);
});
