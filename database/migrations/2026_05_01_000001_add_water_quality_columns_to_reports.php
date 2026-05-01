<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->string('water_body_name', 255)->nullable()->after('severityPercentage');
            $table->decimal('temperature_celsius', 5, 2)->nullable()->after('water_body_name');
            $table->decimal('ph_level', 4, 2)->nullable()->after('temperature_celsius');
            $table->decimal('turbidity_ntu', 8, 2)->nullable()->after('ph_level');
            $table->decimal('total_dissolved_solids_mgl', 8, 2)->nullable()->after('turbidity_ntu');
            $table->date('sampling_date')->nullable()->after('total_dissolved_solids_mgl');
            $table->string('source', 50)->default('app')->after('sampling_date');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn([
                'water_body_name',
                'temperature_celsius',
                'ph_level',
                'turbidity_ntu',
                'total_dissolved_solids_mgl',
                'sampling_date',
                'source',
            ]);
        });
    }
};
