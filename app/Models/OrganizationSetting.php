<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrganizationSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_user_id',
        'auto_accept_join_requests',
    ];

    protected $casts = [
        'auto_accept_join_requests' => 'boolean',
    ];

    public function organization()
    {
        return $this->belongsTo(User::class, 'organization_user_id');
    }
}
