<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'firstName',
        'lastName',
        'email',
        'password',
        'phoneNumber',
        'role',
        'organization',
    ];

    public function reports()
    {
        return $this->hasMany(Report::class, 'user_id');
    }

    public function rewards()
    {
        return $this->hasMany(Reward::class);
    }

    public function attendedEvents()
    {
        return $this->belongsToMany( Event::class);
    }

    public function createdEvents()
    {
        return $this->hasMany(Event::class, 'user_id');
    }
}
