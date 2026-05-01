<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Badge extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'icon_url',
        'type', // 'auto' for auto-issued or 'manual' for admin-issued
        'criteria',
    ];

    protected $casts = [
        'criteria' => 'json',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_badges')
            ->withPivot('earned_at', 'issued_at', 'revoked_at', 'notes')
            ->withTimestamps();
    }
}
