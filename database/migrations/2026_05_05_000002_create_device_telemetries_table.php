<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_telemetries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->timestamp('recorded_at');
            $table->decimal('temperature_celsius', 8, 2)->nullable();
            $table->decimal('ph', 6, 2)->nullable();
            $table->decimal('turbidity_ntu', 10, 2)->nullable();
            $table->decimal('tds_mg_l', 10, 2)->nullable();
            $table->decimal('water_level_cm', 10, 2)->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->index(['device_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_telemetries');
    }
};