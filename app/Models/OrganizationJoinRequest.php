<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrganizationJoinRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'requester_user_id',
        'organization_user_id',
        'status',
        'message',
        'reviewed_by_user_id',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_user_id');
    }

    public function organization()
    {
        return $this->belongsTo(User::class, 'organization_user_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
