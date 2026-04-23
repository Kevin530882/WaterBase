<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrganizationUpdate extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_user_id',
        'title',
        'content',
        'update_type',
        'is_published',
        'published_at',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function organization()
    {
        return $this->belongsTo(User::class, 'organization_user_id');
    }
}
