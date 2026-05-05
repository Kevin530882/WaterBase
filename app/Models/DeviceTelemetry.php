<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeviceTelemetry extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'recorded_at',
        'received_at',
        'reading_timestamp_ms',
        'latency_ms',
        'temperature_celsius',
        'ph',
        'turbidity_ntu',
        'tds_mg_l',
        'water_level_cm',
        'raw_payload',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
        'received_at' => 'datetime',
        'reading_timestamp_ms' => 'integer',
        'latency_ms' => 'integer',
        'raw_payload' => 'array',
    ];

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}