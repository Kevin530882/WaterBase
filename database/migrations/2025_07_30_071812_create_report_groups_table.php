<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('report_groups', function (Blueprint $table) {
            $table->id();
            $table->decimal('center_latitude', 11, 8);
            $table->decimal('center_longitude', 11, 8);
            $table->decimal('radius_meters', 8, 2)->default(50.00);
            $table->timestamp('first_report_at');
            $table->timestamp('last_report_at');
            $table->foreignId('cleanup_event_id')->nullable()->constrained('events');
            $table->boolean('is_active')->default(true);
            $table->integer('report_count')->default(0);
            $table->timestamps();

            // Add indexes for spatial queries
            $table->index(['center_latitude', 'center_longitude']);
            $table->index(['is_active', 'cleanup_event_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_groups');
    }
};
