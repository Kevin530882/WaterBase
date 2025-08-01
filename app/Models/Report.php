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
        'status',
        'verifiedBy'
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
