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

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'firstName',
        'lastName',
        'email',
        'password',
        'phoneNumber',
        'role',
        'approval_status',
        'approved_by',
        'approved_at',
        'approval_notes',
        'organization',
        'organization_proof_document',
        'areaOfResponsibility',
        'profile_photo',
        'bbox_south',
        'bbox_north',
        'bbox_west',
        'bbox_east',
        'expo_push_token',
        'push_token_platform',
        'push_token_app_version',
        'push_token_updated_at',
        'push_notifications_enabled',
        'push_pref_report_updates',
        'push_pref_event_reminders',
        'push_pref_achievements',
        'push_quiet_hours_enabled',
        'push_quiet_hours_start',
        'push_quiet_hours_end',
    ];

    protected $casts = [
        'push_token_updated_at' => 'datetime',
        'approved_at' => 'datetime',
        'push_notifications_enabled' => 'boolean',
        'push_pref_report_updates' => 'boolean',
        'push_pref_event_reminders' => 'boolean',
        'push_pref_achievements' => 'boolean',
        'push_quiet_hours_enabled' => 'boolean',
    ];

    public function reports()
    {
        return $this->hasMany(Report::class, 'user_id');
    }

    public function pairedDevices()
    {
        return $this->hasMany(Device::class, 'paired_by_user_id');
    }

    public function notifications()
    {
        return $this->hasMany(UserNotification::class, 'user_id');
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

    public function members()
    {
        return $this->belongsToMany(
            User::class,
            'organization_memberships',
            'organization_user_id',
            'user_id'
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

    public function approvedBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function badges()
    {
        return $this->belongsToMany(Badge::class, 'user_badges')
            ->withPivot('earned_at', 'issued_at', 'revoked_at', 'notes')
            ->withTimestamps();
    }

    public function isOrganization(): bool
    {
        return in_array(strtolower((string) $this->role), self::ORGANIZATION_ROLES, true);
    }
}
