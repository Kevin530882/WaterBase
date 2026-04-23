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

    public const ORGANIZATION_ROLES = ['ngo', 'lgu', 'researcher'];

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

    public function followedOrganizations()
    {
        return $this->belongsToMany(
            User::class,
            'organization_followers',
            'follower_user_id',
            'organization_user_id'
        )->withTimestamps();
    }

    public function organizationFollowers()
    {
        return $this->belongsToMany(
            User::class,
            'organization_followers',
            'organization_user_id',
            'follower_user_id'
        )->withTimestamps();
    }

    public function memberships()
    {
        return $this->hasMany(OrganizationMembership::class, 'user_id');
    }

    public function organizationMemberships()
    {
        return $this->hasMany(OrganizationMembership::class, 'organization_user_id');
    }

    public function joinedOrganizations()
    {
        return $this->belongsToMany(
            User::class,
            'organization_memberships',
            'user_id',
            'organization_user_id'
        )->withPivot(['joined_via', 'joined_at'])->withTimestamps();
    }

    public function joinRequestsSent()
    {
        return $this->hasMany(OrganizationJoinRequest::class, 'requester_user_id');
    }

    public function joinRequestsReceived()
    {
        return $this->hasMany(OrganizationJoinRequest::class, 'organization_user_id');
    }

    public function organizationUpdates()
    {
        return $this->hasMany(OrganizationUpdate::class, 'organization_user_id');
    }

    public function organizationSetting()
    {
        return $this->hasOne(OrganizationSetting::class, 'organization_user_id');
    }

    public function isOrganization(): bool
    {
        return in_array(strtolower((string) $this->role), self::ORGANIZATION_ROLES, true);
    }
}
