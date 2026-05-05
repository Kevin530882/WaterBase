<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_maintenance_schedules', function (Blueprint $table) {
            $table->integer('reminder_days_before')->default(14)->after('calibration_interval_days');
        });
    }

    public function down(): void
    {
        Schema::table('device_maintenance_schedules', function (Blueprint $table) {
            $table->dropColumn('reminder_days_before');
        });
    }
};
