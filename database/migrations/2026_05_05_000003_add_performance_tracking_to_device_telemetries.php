<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('device_telemetries', function (Blueprint $table) {
            // Performance tracking columns
            $table->unsignedBigInteger('reading_timestamp_ms')->nullable()->after('recorded_at')
                ->comment('Device milliseconds when sensor was read (boot time)');
            $table->unsignedBigInteger('latency_ms')->nullable()->after('reading_timestamp_ms')
                ->comment('Calculated: received_at - recorded_at in milliseconds');
            
            // Index for performance queries
            $table->index(['device_id', 'latency_ms'], 'idx_device_latency');
            $table->index('latency_ms', 'idx_latency_performance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('device_telemetries', function (Blueprint $table) {
            $table->dropIndex('idx_device_latency');
            $table->dropIndex('idx_latency_performance');
            $table->dropColumn(['reading_timestamp_ms', 'latency_ms']);
        });
    }
};
