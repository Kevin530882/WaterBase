<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    protected $fillable = [
        'title',
        'content',
        'address',
        'latitude',
        'longitude',
        'pollutionType',
        'severityByUser',
        'severityByAI',
        'ai_confidence',
        'severityPercentage',
        'ai_verified',
        'image',
        'ai_annotated_image',
        'user_id',
        'report_group_id',
        'status',
        'verifiedBy',
        'verified_at',
        'admin_notes',
        'auto_approved',
        'auto_approved_at',
        'water_body_name',
        'temperature_celsius',
        'ph_level',
        'turbidity_ntu',
        'total_dissolved_solids_mgl',
        'sampling_date',
        'source',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'auto_approved' => 'boolean',
        'auto_approved_at' => 'datetime',
        'temperature_celsius' => 'decimal:2',
        'ph_level' => 'decimal:2',
        'turbidity_ntu' => 'decimal:2',
        'total_dissolved_solids_mgl' => 'decimal:2',
        'sampling_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verifiedBy');
    }

    public function reportGroup(): BelongsTo
    {
        return $this->belongsTo(ReportGroup::class, 'report_group_id');
    }
}
