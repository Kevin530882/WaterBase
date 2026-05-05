<?php

namespace App\Console\Commands;

use App\Services\DeviceMaintenanceService;
use Illuminate\Console\Command;

class CheckDeviceMaintenance extends Command
{
    protected $signature = 'device:check-maintenance';
    protected $description = 'Check device maintenance schedules and send reminders';

    public function handle(DeviceMaintenanceService $service): int
    {
        $service->checkAndSendReminders();
        $this->info('Maintenance reminders checked.');
        return self::SUCCESS;
    }
}
