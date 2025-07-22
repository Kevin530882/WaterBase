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
        'status',
        'user_id',
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
