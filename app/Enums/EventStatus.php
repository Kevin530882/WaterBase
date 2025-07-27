<?php

namespace App\Enums;

enum EventStatus: string
{
    //
    case RECRUITING = "recruiting";
    case ACTIVE = "active";
    case COMPLETED = "completed";
    case CANCELLED = "cancelled";
}
