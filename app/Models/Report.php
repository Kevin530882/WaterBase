<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    //
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
        'status'
    ];

    public function user()
    {
        return $this->belongsTo(User::class,'user_id');
    }
}
