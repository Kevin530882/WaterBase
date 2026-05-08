<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            $table->unsignedInteger('wbsi_named_water_body_segment_radius_m')->default(500)->after('csv_auto_approve_enabled');
            $table->unsignedInteger('wbsi_ungrouped_proximity_radius_m')->default(150)->after('wbsi_named_water_body_segment_radius_m');
            $table->unsignedInteger('wbsi_sensor_assignment_radius_m')->default(1000)->after('wbsi_ungrouped_proximity_radius_m');
            $table->decimal('wbsi_sensor_weight', 4, 2)->default(0.60)->after('wbsi_sensor_assignment_radius_m');
            $table->decimal('wbsi_report_weight', 4, 2)->default(0.40)->after('wbsi_sensor_weight');

            $table->decimal('wbsi_freshwater_ph_min', 4, 2)->default(6.50)->after('wbsi_report_weight');
            $table->decimal('wbsi_freshwater_ph_max', 4, 2)->default(8.50)->after('wbsi_freshwater_ph_min');
            $table->decimal('wbsi_freshwater_turbidity_ntu', 8, 2)->default(5.00)->after('wbsi_freshwater_ph_max');
            $table->decimal('wbsi_freshwater_tds_mg_l', 10, 2)->default(500.00)->after('wbsi_freshwater_turbidity_ntu');
            $table->decimal('wbsi_freshwater_temperature_min_celsius', 5, 2)->default(24.00)->after('wbsi_freshwater_tds_mg_l');
            $table->decimal('wbsi_freshwater_temperature_max_celsius', 5, 2)->default(32.00)->after('wbsi_freshwater_temperature_min_celsius');

            $table->decimal('wbsi_marine_ph_min', 4, 2)->default(7.50)->after('wbsi_freshwater_temperature_max_celsius');
            $table->decimal('wbsi_marine_ph_max', 4, 2)->default(8.50)->after('wbsi_marine_ph_min');
            $table->decimal('wbsi_marine_turbidity_ntu', 8, 2)->default(5.00)->after('wbsi_marine_ph_max');
            $table->decimal('wbsi_marine_tds_mg_l', 10, 2)->default(35000.00)->after('wbsi_marine_turbidity_ntu');
            $table->decimal('wbsi_marine_temperature_min_celsius', 5, 2)->default(24.00)->after('wbsi_marine_tds_mg_l');
            $table->decimal('wbsi_marine_temperature_max_celsius', 5, 2)->default(32.00)->after('wbsi_marine_temperature_min_celsius');
        });
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            $table->dropColumn([
                'wbsi_named_water_body_segment_radius_m',
                'wbsi_ungrouped_proximity_radius_m',
                'wbsi_sensor_assignment_radius_m',
                'wbsi_sensor_weight',
                'wbsi_report_weight',
                'wbsi_freshwater_ph_min',
                'wbsi_freshwater_ph_max',
                'wbsi_freshwater_turbidity_ntu',
                'wbsi_freshwater_tds_mg_l',
                'wbsi_freshwater_temperature_min_celsius',
                'wbsi_freshwater_temperature_max_celsius',
                'wbsi_marine_ph_min',
                'wbsi_marine_ph_max',
                'wbsi_marine_turbidity_ntu',
                'wbsi_marine_tds_mg_l',
                'wbsi_marine_temperature_min_celsius',
                'wbsi_marine_temperature_max_celsius',
            ]);
        });
    }
};
