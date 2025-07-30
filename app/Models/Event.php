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
        'report_group_id',
    ];

    protected $casts = [
        'date' => 'date',
        'time' => 'datetime:H:i',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'duration' => 'decimal:2',
    ];

    public function getCurrentVolunteersAttribute()
    {
        return $this->attendees()->count();
    }

    protected $appends = ['currentVolunteers'];

    public function attendees()
    {
        return $this->belongsToMany(User::class, 'event_user')
            ->withPivot(['joined_at'])
            ->withTimestamps();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reportGroup()
    {
        return $this->belongsTo(ReportGroup::class);
    }
}
