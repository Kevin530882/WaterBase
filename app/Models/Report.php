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
        'admin_notes'
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
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
