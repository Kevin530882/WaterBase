<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('user_status')->default('active')->after('approval_notes');
            $table->timestamp('ban_duration')->nullable()->after('user_status');
            $table->unsignedInteger('risk_metric_score')->default(0)->after('ban_duration');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['user_status', 'ban_duration', 'risk_metric_score']);
        });
    }
};