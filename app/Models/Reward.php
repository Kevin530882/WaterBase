<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reward extends Model
{
    //
    protected $fillable = [
        'name',
        'event',
        'type',
    ];

    public function user()
    {
        return $this->belongsToMany(User::class);
    }
}
