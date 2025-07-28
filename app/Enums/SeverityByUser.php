<?php

namespace App\Enums;

enum SeverityByUser: string
{
    //
    case LOW = "low";
    case MEDIUM = "medium";
    case HIGH = "high";
    case CRITICAL = "critical";
}
