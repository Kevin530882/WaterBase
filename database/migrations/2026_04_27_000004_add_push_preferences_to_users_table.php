<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('push_pref_report_updates')->default(true)->after('push_notifications_enabled');
            $table->boolean('push_pref_event_reminders')->default(true)->after('push_pref_report_updates');
            $table->boolean('push_pref_achievements')->default(false)->after('push_pref_event_reminders');
            $table->boolean('push_quiet_hours_enabled')->default(false)->after('push_pref_achievements');
            $table->string('push_quiet_hours_start', 5)->nullable()->after('push_quiet_hours_enabled');
            $table->string('push_quiet_hours_end', 5)->nullable()->after('push_quiet_hours_start');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'push_pref_report_updates',
                'push_pref_event_reminders',
                'push_pref_achievements',
                'push_quiet_hours_enabled',
                'push_quiet_hours_start',
                'push_quiet_hours_end',
            ]);
        });
    }
};
