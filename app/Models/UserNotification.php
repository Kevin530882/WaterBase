<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'channel',
        'severity',
        'title',
        'message',
        'metadata',
        'idempotency_key',
        'read_at',
        'delivered_at',
        'failed_at',
        'last_error',
        'attempts',
    ];

    protected $casts = [
        'metadata' => 'array',
        'read_at' => 'datetime',
        'delivered_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
