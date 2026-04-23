<?php

namespace App\Enums;

enum NotificationType: string
{
    case EVENT_CREATED = 'event_created';
    case EVENT_ONGOING = 'event_ongoing';
    case EVENT_COMPLETED = 'event_completed';
    case REPORT_STATUS_CHANGED = 'report_status_changed';
    case REPORT_PROCESSING_FAILED = 'report_processing_failed';
}
