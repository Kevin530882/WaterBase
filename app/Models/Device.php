<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Device extends Model
{
    use HasFactory;

    protected $fillable = [
        'mac_address',
        'station_id',
        'name',
        'status',
        'paired_by_user_id',
        'paired_at',
        'discovery_last_seen_at',
        'last_seen_at',
        'firmware_version',
        'hardware_revision',
        'raw_discovery_payload',
        'latitude',
        'longitude',
        'anomaly_flags',
    ];

    protected $casts = [
        'paired_at' => 'datetime',
        'discovery_last_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'raw_discovery_payload' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
        'anomaly_flags' => 'array',
    ];

    public function pairedByUser()
    {
        return $this->belongsTo(User::class, 'paired_by_user_id');
    }

    public function telemetry(): HasMany
    {
        return $this->hasMany(DeviceTelemetry::class);
    }

    public function latestTelemetry(): HasOne
    {
        return $this->hasOne(DeviceTelemetry::class)->latestOfMany('recorded_at');
    }

    public function maintenanceSchedule(): HasOne
    {
        return $this->hasOne(DeviceMaintenanceSchedule::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(DeviceMaintenanceLog::class);
    }

    public function metricsDaily(): HasMany
    {
        return $this->hasMany(MetricsDaily::class);
    }

    public function metricsMonthly(): HasMany
    {
        return $this->hasMany(MetricsMonthly::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(DeviceActivityLog::class)->orderByDesc('created_at');
    }

    public function scopeDiscovered($query)
    {
        return $query->whereNull('paired_at')->whereNotNull('discovery_last_seen_at');
    }

    public function scopePaired($query)
    {
        return $query->whereNotNull('paired_at');
    }
}
