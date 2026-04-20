<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'firstName',
        'lastName',
        'email',
        'password',
        'phoneNumber',
        'role',
        'organization',
        'areaOfResponsibility',
        'profile_photo',
        'bbox_south',
        'bbox_north',
        'bbox_west',
        'bbox_east',
    ];

    public function reports()
    {
        return $this->hasMany(Report::class, 'user_id');
    }

    public function attendedEvents()
    {
        return $this->belongsToMany(Event::class);
    }

    public function createdEvents()
    {
        return $this->hasMany(Event::class, 'user_id');
    }
}
