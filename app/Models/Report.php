<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    protected $fillable = [
        'title',
        'content',
        'address',
        'latitude',
        'longitude',
        'pollutionType',
        'severityByUser',
        'image',
        'user_id',
        'status',
        'region_code',
        'region_name',
        'province_name',
        'municipality_name',
        'barangay_name',
        'report_group_id',
        'geocoded_at',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'geocoded_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reportGroup(): BelongsTo
    {
        return $this->belongsTo(ReportGroup::class);
    }

    /**
     * Check if the report has been geocoded
     */
    public function isGeocoded(): bool
    {
        return !is_null($this->geocoded_at);
    }

    /**
     * Get the full location hierarchy as an array
     */
    public function getLocationHierarchy(): array
    {
        return [
            'region_code' => $this->region_code,
            'region_name' => $this->region_name,
            'province_name' => $this->province_name,
            'municipality_name' => $this->municipality_name,
            'barangay_name' => $this->barangay_name,
        ];
    }

    /**
     * Get the most specific location level available
     */
    public function getMostSpecificLocation(): array
    {
        if ($this->barangay_name) {
            return ['level' => 'barangay', 'name' => $this->barangay_name];
        }
        if ($this->municipality_name) {
            return ['level' => 'municipality', 'name' => $this->municipality_name];
        }
        if ($this->province_name) {
            return ['level' => 'province', 'name' => $this->province_name];
        }
        if ($this->region_name) {
            return ['level' => 'region', 'name' => $this->region_name];
        }

        return ['level' => 'unknown', 'name' => null];
    }
}
