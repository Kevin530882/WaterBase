<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    //
    protected $fillable = [
        'title',
        'address',
        'latitude',
        'longitude',
        'date',
        'time',
        'duration',
        'description',
        'maxVolunteers',
        'points',
        'badge',
        'status',
        'user_id',
    ];

    protected $casts = [
        'date' => 'date',
        'time' => 'datetime:H:i',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'duration' => 'decimal:2',
    ];

    public function attendees()
    {
        return $this->belongsToMany(User::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
