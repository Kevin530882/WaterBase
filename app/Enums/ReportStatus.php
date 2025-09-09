<?php

namespace App\Enums;

enum ReportStatus: string
{
    //
    case PENDING = "pending";
    case VERIFIED = "verified";
    case RESOLVED = "resolved";
    case DECLINED = "declined";
}
