<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportGroup extends Model
{
    protected $fillable = [
        'center_latitude',
        'center_longitude',
        'radius_meters',
        'first_report_at',
        'last_report_at',
        'cleanup_event_id',
        'is_active',
        'report_count'
    ];

    protected $casts = [
        'center_latitude' => 'decimal:8',
        'center_longitude' => 'decimal:8',
        'radius_meters' => 'decimal:2',
        'first_report_at' => 'datetime',
        'last_report_at' => 'datetime',
        'is_active' => 'boolean'
    ];

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'report_group_id');
    }

    public function cleanupEvent(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'cleanup_event_id');
    }
}
