<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\GeographicController;
use App\Http\Controllers\DetectPollutionController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AdminReportsController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ForecastController;
use App\Http\Controllers\OrganizationSocialController;
use App\Http\Controllers\SystemSettingsController;

Route::post('/login', [UserController::class, 'login']);
Route::post('/register', [UserController::class, 'register']);
Route::get('/organizations', [UserController::class, 'getOrganizations']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [UserController::class, 'logout']);

    // Event routes
    Route::apiResource('events', EventController::class);
    Route::post('/events/{id}/join', [EventController::class, 'join']);
    Route::get('/events/{id}/volunteers', [EventController::class, 'getVolunteers']);
    Route::get('/user/events', [EventController::class, 'getUserEvents']);

    // Report routes - specific routes MUST come before resourceful routes
    Route::get('/reports/all', [ReportController::class, 'all']);
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

    // Dashboard routes
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
    Route::get('/dashboard/recent-reports', [DashboardController::class, 'getRecentReports']);
    Route::get('/dashboard/reports-by-region', [DashboardController::class, 'getReportsByRegion']);
    Route::get('/dashboard/monthly-trends', [DashboardController::class, 'getMonthlyTrends']);
    Route::get('/forecast', [ForecastController::class, 'index']);
    Route::get('/forecast/kpis', [ForecastController::class, 'kpis']);

    Route::post('/predict', [DetectPollutionController::class, 'predict']);

    // Organization social routes
    Route::get('/organizations/directory', [OrganizationSocialController::class, 'directory']);
    Route::get('/organizations/{orgId}/profile', [OrganizationSocialController::class, 'getOrganizationProfile']);
    Route::post('/organizations/{orgId}/follow', [OrganizationSocialController::class, 'follow']);
    Route::delete('/organizations/{orgId}/follow', [OrganizationSocialController::class, 'unfollow']);
    Route::get('/organizations/{orgId}/follow-status', [OrganizationSocialController::class, 'followStatus']);

    Route::post('/organizations/{orgId}/join-requests', [OrganizationSocialController::class, 'createJoinRequest']);
    Route::get('/organizations/{orgId}/join-requests', [OrganizationSocialController::class, 'orgJoinRequests']);
    Route::patch('/organizations/{orgId}/join-requests/{requestId}', [OrganizationSocialController::class, 'handleJoinRequest']);

    Route::get('/organizations/{orgId}/join-settings', [OrganizationSocialController::class, 'getJoinSettings']);
    Route::patch('/organizations/{orgId}/join-settings', [OrganizationSocialController::class, 'updateJoinSettings']);

    Route::post('/organizations/updates', [OrganizationSocialController::class, 'publishUpdate']);
    Route::get('/community/feed', [OrganizationSocialController::class, 'communityFeed']);

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read-state', [NotificationController::class, 'markReadState']);
    Route::patch('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);

    Route::get('/user/organizations', [OrganizationSocialController::class, 'userOrganizations']);
    Route::get('/user/joined-organizations', [OrganizationSocialController::class, 'userJoinedOrganizations']);
    Route::get('/user/following-organizations', [OrganizationSocialController::class, 'userFollowingOrganizations']);
    Route::get('/user/join-requests', [OrganizationSocialController::class, 'userJoinRequests']);
    
    Route::get('/admin/reports', [AdminReportsController::class, 'getAllReports']);
    Route::get('/admin/reports/stats', [AdminReportsController::class, 'getReportStats']);

    Route::get('/admin/reports/pending', [AdminDashboardController::class, 'getPendingReports']);
    Route::put('/admin/reports/{report}/status', [AdminDashboardController::class, 'updateStatus']);

    Route::get('/admin/users', [AdminDashboardController::class, 'getExistingUsers']);
    Route::put('/admin/users/{user}', [AdminDashboardController::class, 'editExistingUser']);
    Route::delete('/admin/users/{user}', [AdminDashboardController::class, 'deleteUser']);

    Route::get("/admin/events", [AdminDashboardController::class,"getEvents"]);
    Route::delete('/admin/events/{event}', [AdminDashboardController::class, 'deleteEvent']);

    Route::get('/admin/stats', [AdminDashboardController::class, 'getAdminStats']);
    Route::get('/admin/reports/high-severity', [AdminDashboardController::class, 'getRecentHighSeverityReports']);

    // System settings
    Route::get('/admin/system-settings', [SystemSettingsController::class, 'get']);
    Route::put('/admin/system-settings', [SystemSettingsController::class, 'update']);
});
