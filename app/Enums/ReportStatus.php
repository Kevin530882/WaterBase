<?php

namespace App\Enums;

enum ReportStatus: string
{
    //
    case Pending = "pending";
    case Verified = "verified";
    case Resolved = "resolved";
}
