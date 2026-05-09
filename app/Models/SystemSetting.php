<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use HasFactory;

    public const DEFAULTS = [
        'auto_approve_enabled' => false,
        'auto_approve_threshold' => 80,
        'csv_auto_approve_enabled' => false,
        'risky_user_threshold' => 5,
        'wbsi_named_water_body_segment_radius_m' => 500,
        'wbsi_ungrouped_proximity_radius_m' => 150,
        'wbsi_sensor_assignment_radius_m' => 1000,
        'wbsi_sensor_weight' => 0.60,
        'wbsi_report_weight' => 0.40,
        'wbsi_freshwater_ph_min' => 6.50,
        'wbsi_freshwater_ph_max' => 8.50,
        'wbsi_freshwater_turbidity_ntu' => 5.00,
        'wbsi_freshwater_tds_mg_l' => 500.00,
        'wbsi_freshwater_temperature_min_celsius' => 24.00,
        'wbsi_freshwater_temperature_max_celsius' => 32.00,
        'wbsi_marine_ph_min' => 7.50,
        'wbsi_marine_ph_max' => 8.50,
        'wbsi_marine_turbidity_ntu' => 5.00,
        'wbsi_marine_tds_mg_l' => 35000.00,
        'wbsi_marine_temperature_min_celsius' => 24.00,
        'wbsi_marine_temperature_max_celsius' => 32.00,
    ];

    protected $fillable = [
        'auto_approve_enabled',
        'auto_approve_threshold',
        'csv_auto_approve_enabled',
        'risky_user_threshold',
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
    ];

    protected $casts = [
        'auto_approve_enabled' => 'boolean',
        'csv_auto_approve_enabled' => 'boolean',
        'risky_user_threshold' => 'integer',
        'wbsi_sensor_weight' => 'float',
        'wbsi_report_weight' => 'float',
        'wbsi_freshwater_ph_min' => 'float',
        'wbsi_freshwater_ph_max' => 'float',
        'wbsi_freshwater_turbidity_ntu' => 'float',
        'wbsi_freshwater_tds_mg_l' => 'float',
        'wbsi_freshwater_temperature_min_celsius' => 'float',
        'wbsi_freshwater_temperature_max_celsius' => 'float',
        'wbsi_marine_ph_min' => 'float',
        'wbsi_marine_ph_max' => 'float',
        'wbsi_marine_turbidity_ntu' => 'float',
        'wbsi_marine_tds_mg_l' => 'float',
        'wbsi_marine_temperature_min_celsius' => 'float',
        'wbsi_marine_temperature_max_celsius' => 'float',
    ];

    public static function current(): self
    {
        $settings = self::query()->latest()->first();

        if (!$settings) {
            return new self(self::DEFAULTS);
        }

        foreach (self::DEFAULTS as $key => $value) {
            if ($settings->{$key} === null) {
                $settings->{$key} = $value;
            }
        }

        return $settings;
    }
}

