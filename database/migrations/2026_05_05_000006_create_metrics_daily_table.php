<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metrics_daily', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->date('date');
            $table->decimal('avg_ph', 6, 2)->nullable();
            $table->decimal('avg_tds_mg_l', 10, 2)->nullable();
            $table->decimal('avg_turbidity_ntu', 10, 2)->nullable();
            $table->decimal('avg_temp_celsius', 8, 2)->nullable();
            $table->decimal('min_ph', 6, 2)->nullable();
            $table->decimal('max_ph', 6, 2)->nullable();
            $table->decimal('min_tds_mg_l', 10, 2)->nullable();
            $table->decimal('max_tds_mg_l', 10, 2)->nullable();
            $table->decimal('min_turbidity_ntu', 10, 2)->nullable();
            $table->decimal('max_turbidity_ntu', 10, 2)->nullable();
            $table->integer('reading_count')->default(0);
            $table->timestamps();

            $table->unique(['device_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metrics_daily');
    }
};
