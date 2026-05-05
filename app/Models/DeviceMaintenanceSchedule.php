<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceMaintenanceSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'calibration_interval_days',
        'reminder_days_before',
        'last_calibrated_at',
        'next_due_at',
        'reminder_sent_at',
    ];

    protected $casts = [
        'last_calibrated_at' => 'datetime',
        'next_due_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
