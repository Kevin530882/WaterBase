<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventCleanupEvidence extends Model
{
    protected $table = 'event_cleanup_evidences';

    protected $fillable = [
        'event_id',
        'submitted_by',
        'image',
        'ai_annotated_image',
        'latitude',
        'longitude',
        'ai_severity',
        'ai_confidence',
        'pollution_percentage',
        'ai_verified',
        'result',
        'notes',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'ai_confidence' => 'decimal:2',
        'pollution_percentage' => 'decimal:2',
        'ai_verified' => 'boolean',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
