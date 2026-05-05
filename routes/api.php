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
use App\Http\Controllers\BadgeController;
use App\Http\Controllers\ResearchDocumentController;
use App\Http\Controllers\DeviceController;

use App\Http\Controllers\MaintenanceController;


Route::post('/login', [UserController::class, 'login']);
Route::post('/register', [UserController::class, 'register']);
Route::get('/organizations', [UserController::class, 'getOrganizations']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [UserController::class, 'logout']);
    Route::post('/user/push-token', [UserController::class, 'registerPushToken']);
    Route::delete('/user/push-token', [UserController::class, 'revokePushToken']);

    // Event routes
    Route::apiResource('events', EventController::class);
    Route::post('/events/{id}/join', [EventController::class, 'join']);
    Route::post('/events/{id}/leave', [EventController::class, 'leave']);
    Route::post('/events/{id}/cancel', [EventController::class, 'cancel']);
    Route::post('/events/{id}/start', [EventController::class, 'start']);
    Route::post('/events/{id}/qr-scan', [EventController::class, 'qrScan']);
    Route::post('/events/{id}/message-volunteers', [EventController::class, 'messageVolunteers']);
    Route::post('/events/{id}/complete', [EventController::class, 'complete']);
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
    Route::post('/reports/bulk-upload', [ReportController::class, 'bulkUpload']);

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

    // Device / telemetry routes
    Route::get('/devices', [DeviceController::class, 'index']);
    Route::get('/devices/map', [DeviceController::class, 'mapDevices']);
    Route::get('/devices/discovered', [DeviceController::class, 'discovered']);
    Route::get('/devices/maintenance/overdue', [DeviceController::class, 'overdueMaintenance']);
    Route::get('/devices/maintenance/upcoming', [DeviceController::class, 'upcomingMaintenance']);

    Route::get('/devices/{device}', [DeviceController::class, 'show']);
    Route::delete('/devices/{device}', [DeviceController::class, 'destroy']);
    Route::post('/devices/{device}/pair', [DeviceController::class, 'pair']);
    Route::post('/devices/{device}/location', [DeviceController::class, 'updateLocation']);
    Route::post('/devices/{device}/calibrate', [DeviceController::class, 'calibrate']);
    Route::get('/devices/{device}/maintenance', [DeviceController::class, 'maintenance']);
    Route::put('/devices/{device}/maintenance/schedule', [DeviceController::class, 'updateMaintenanceSchedule']);
    Route::get('/devices/{device}/activity-logs', [DeviceController::class, 'activityLogs']);
    Route::get('/devices/{device}/metrics/daily', [DeviceController::class, 'dailyMetrics']);
    Route::get('/devices/{device}/metrics/monthly', [DeviceController::class, 'monthlyMetrics']);
    Route::post('/devices/{device}/live-read', [DeviceController::class, 'liveRead']);
    Route::post('/devices/{device}/telemetry', [DeviceController::class, 'storeTelemetry']);
    Route::post('/devices/{device}/commands', [DeviceController::class, 'command']);
    Route::get('/devices/{device}/telemetry/latest', [DeviceController::class, 'latest']);
    Route::get('/devices/{device}/telemetry', [DeviceController::class, 'history']);
    Route::get('/devices/{device}/performance', [DeviceController::class, 'performance']);

    // Organization social routes
    Route::get('/organizations/directory', [OrganizationSocialController::class, 'directory']);
    Route::get('/organizations/{orgId}/profile', [OrganizationSocialController::class, 'getOrganizationProfile']);
    Route::post('/organizations/{orgId}/follow', [OrganizationSocialController::class, 'follow']);
    Route::delete('/organizations/{orgId}/follow', [OrganizationSocialController::class, 'unfollow']);
    Route::get('/organizations/{orgId}/follow-status', [OrganizationSocialController::class, 'followStatus']);

    Route::post('/organizations/{orgId}/join-requests', [OrganizationSocialController::class, 'createJoinRequest']);
    Route::get('/organizations/{orgId}/join-requests', [OrganizationSocialController::class, 'orgJoinRequests']);
    Route::patch('/organizations/{orgId}/join-requests/{requestId}', [OrganizationSocialController::class, 'handleJoinRequest']);
    Route::delete('/organizations/{orgId}/join-requests/{requestId}', [OrganizationSocialController::class, 'cancelJoinRequest']);

    Route::get('/organizations/{orgId}/join-settings', [OrganizationSocialController::class, 'getJoinSettings']);
    Route::patch('/organizations/{orgId}/join-settings', [OrganizationSocialController::class, 'updateJoinSettings']);

    Route::post('/organizations/updates', [OrganizationSocialController::class, 'publishUpdate']);
    Route::get('/community/feed', [OrganizationSocialController::class, 'communityFeed']);

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/preferences', [NotificationController::class, 'getPreferences']);
    Route::patch('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
    Route::patch('/notifications/{notification}/read-state', [NotificationController::class, 'markReadState']);
    Route::patch('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    // Badge/Certificate routes
    Route::get('/badges', [BadgeController::class, 'index']);
    Route::get('/users/{userId}/badges', [BadgeController::class, 'userBadges']);
    Route::post('/badges/issue', [BadgeController::class, 'issueBadge']);
    Route::post('/badges/auto-issue', [BadgeController::class, 'autoIssueBadge']);
    Route::delete('/users/{userId}/badges/{badgeId}', [BadgeController::class, 'revokeBadge']);
    Route::post('/admin/badges', [BadgeController::class, 'store']);
    Route::patch('/admin/badges/{badgeId}', [BadgeController::class, 'update']);
    Route::delete('/admin/badges/{badgeId}', [BadgeController::class, 'destroy']);
    Route::post('/admin/badges/icon', [BadgeController::class, 'uploadIcon']);


    Route::get('/user/organizations', [OrganizationSocialController::class, 'userOrganizations']);
    Route::get('/user/organization-audience', [OrganizationSocialController::class, 'organizationMembersAndFollowers']);
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

    Route::get('/admin/organizations/pending', [AdminDashboardController::class, 'getPendingOrganizations']);
    Route::post('/admin/organizations/{user}/approve', [AdminDashboardController::class, 'approveOrganization']);
    Route::post('/admin/organizations/{user}/reject', [AdminDashboardController::class, 'rejectOrganization']);

    // System settings
    Route::get('/admin/system-settings', [SystemSettingsController::class, 'get']);
    Route::put('/admin/system-settings', [SystemSettingsController::class, 'update']);

    // Maintenance routes
    Route::get('/admin/maintenance/health', [MaintenanceController::class, 'healthCheck']);

    // Research documents
    Route::apiResource('research-documents', ResearchDocumentController::class);
    Route::post('/admin/maintenance/cache-clear', [MaintenanceController::class, 'clearCache']);
    Route::post('/admin/maintenance/view-clear', [MaintenanceController::class, 'clearViewCache']);
    Route::post('/admin/maintenance/route-clear', [MaintenanceController::class, 'clearRouteCache']);
    Route::post('/admin/maintenance/queue-restart', [MaintenanceController::class, 'restartQueue']);
    Route::get('/admin/maintenance/logs', [MaintenanceController::class, 'getLogs']);
    Route::get('/admin/maintenance/logs/export', [MaintenanceController::class, 'exportLogs']);
    Route::get('/admin/maintenance/stats', [MaintenanceController::class, 'getStatistics']);
});
