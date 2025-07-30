<?php

namespace App\Console\Commands;

use App\Services\ReportAccessControlService;
use Illuminate\Console\Command;

class GeocodeReports extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:geocode {--limit=100 : Number of reports to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Geocode reports that haven\'t been processed yet';

    private ReportAccessControlService $accessControlService;

    /**
     * Create a new command instance.
     */
    public function __construct(ReportAccessControlService $accessControlService)
    {
        parent::__construct();
        $this->accessControlService = $accessControlService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $limit = (int) $this->option('limit');

        $this->info("Starting geocoding process for up to {$limit} reports...");

        $results = $this->accessControlService->batchGeocodeReports($limit);

        $this->info("Geocoding completed:");
        $this->info("- Processed: {$results['processed']} reports");
        $this->info("- Success: {$results['success']} reports");
        $this->info("- Failed: {$results['failed']} reports");

        if (!empty($results['errors'])) {
            $this->warn("Errors encountered:");
            foreach ($results['errors'] as $error) {
                $this->error("  {$error}");
            }
        }

        return $results['failed'] > 0 ? 1 : 0;
    }
}
