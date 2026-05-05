<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetricsDaily extends Model
{
    use HasFactory;

    protected $table = 'metrics_daily';

    protected $fillable = [
        'device_id',
        'date',
        'avg_ph',
        'avg_tds_mg_l',
        'avg_turbidity_ntu',
        'avg_temp_celsius',
        'min_ph',
        'max_ph',
        'min_tds_mg_l',
        'max_tds_mg_l',
        'min_turbidity_ntu',
        'max_turbidity_ntu',
        'reading_count',
    ];

    protected $casts = [
        'date' => 'date',
        'avg_ph' => 'float',
        'avg_tds_mg_l' => 'float',
        'avg_turbidity_ntu' => 'float',
        'avg_temp_celsius' => 'float',
        'min_ph' => 'float',
        'max_ph' => 'float',
        'min_tds_mg_l' => 'float',
        'max_tds_mg_l' => 'float',
        'min_turbidity_ntu' => 'float',
        'max_turbidity_ntu' => 'float',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
