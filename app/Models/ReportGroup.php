<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportGroup extends Model
{
    protected $fillable = [
        'center_latitude',
        'center_longitude',
        'radius_meters',
        'first_report_at',
        'last_report_at',
        'cleanup_event_id',
        'is_active',
        'report_count',
    ];

    protected $casts = [
        'center_latitude' => 'decimal:8',
        'center_longitude' => 'decimal:8',
        'radius_meters' => 'decimal:2',
        'first_report_at' => 'datetime',
        'last_report_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Get all reports in this group
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    /**
     * Get the cleanup event for this group
     */
    public function cleanupEvent(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'cleanup_event_id');
    }

    /**
     * Check if this group has an active cleanup event
     */
    public function hasCleanupEvent(): bool
    {
        return !is_null($this->cleanup_event_id);
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    public static function calculateDistance($lat1, $lon1, $lat2, $lon2): float
    {
        $earthRadius = 6371000; // Earth radius in meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Check if a point is within this group's radius
     */
    public function containsPoint($latitude, $longitude): bool
    {
        $distance = self::calculateDistance(
            (float) $this->center_latitude,
            (float) $this->center_longitude,
            (float) $latitude,
            (float) $longitude
        );

        return $distance <= (float) $this->radius_meters;
    }
}
