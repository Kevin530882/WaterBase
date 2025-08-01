<?php

namespace App\Console\Commands;

use Ill        // Find organizations without bounding boxes
        $query = User::whereIn('role', ['ngo', 'lgu', 'researcher'])
            ->whereNotNull('areaOfResponsibility')
            ->where('areaOfResponsibility', '!=', '');

        // If force option is used, include organizations that already have bounds
        if (!$this->option('force')) {
            $query->where(function($q) {
                $q->whereNull('bbox_south')
                  ->orWhereNull('bbox_north')
                  ->orWhereNull('bbox_west')
                  ->orWhereNull('bbox_east');
            });
        }

        // If specific organization ID is provided
        if ($orgId = $this->option('org')) {
            $query->where('id', $orgId);
        }

        $organizations = $query->get(['id', 'organization', 'areaOfResponsibility', 'role']);sole\Command;
use App\Models\User;
use App\Services\GeographicService;
use Illuminate\Support\Facades\Log;

class BackfillGeographicBounds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'geographic:backfill 
                            {--dry-run : Run without making changes}
                            {--force : Re-geocode even if bounds already exist}
                            {--org= : Process specific organization ID only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill geographic bounding boxes for existing organizations';

    protected GeographicService $geographicService;

    public function __construct(GeographicService $geographicService)
    {
        parent::__construct();
        $this->geographicService = $geographicService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 Running in DRY RUN mode - no changes will be made');
        }

        // Find organizations without bounding boxes
        $query = User::whereIn('role', ['ngo', 'lgu', 'researcher'])
            ->whereNotNull('areaOfResponsibility')
            ->where('areaOfResponsibility', '!=', '');

        // If force option is used, include organizations that already have bounds
        if (!$this->option('force')) {
            $query->where(function($q) {
                $q->whereNull('bbox_south')
                  ->orWhereNull('bbox_north')
                  ->orWhereNull('bbox_west')
                  ->orWhereNull('bbox_east');
            });
        }

        // If specific organization ID is provided
        if ($orgId = $this->option('org')) {
            $query->where('id', $orgId);
        }

        $organizations = $query->get(['id', 'organization', 'areaOfResponsibility', 'role']);

        if ($organizations->isEmpty()) {
            $this->info('✅ No organizations found that need geographic backfilling');
            return;
        }

        $this->info("📍 Found {$organizations->count()} organizations that need geographic bounding boxes");

        $progressBar = $this->output->createProgressBar($organizations->count());
        $progressBar->start();

        $successCount = 0;
        $failureCount = 0;
        $errors = [];

        foreach ($organizations as $org) {
            $this->newLine();
            $this->info("Processing: {$org->organization} ({$org->areaOfResponsibility})");

            if ($dryRun) {
                $this->line("  Would geocode: {$org->areaOfResponsibility}");
                $successCount++;
            } else {
                $result = $this->geographicService->registerAreaOfResponsibility(
                    $org->id,
                    $org->areaOfResponsibility
                );

                if ($result['success']) {
                    $this->line("  ✅ Success: Got bounding box");
                    $successCount++;
                } else {
                    $this->line("  ❌ Failed: {$result['error']}");
                    $failureCount++;
                    $errors[] = [
                        'organization' => $org->organization,
                        'area' => $org->areaOfResponsibility,
                        'error' => $result['error']
                    ];
                }

                // Add a small delay to be respectful to Nominatim API
                sleep(1);
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Summary
        $this->info("📊 Backfill Summary:");
        $this->line("  ✅ Successful: {$successCount}");
        $this->line("  ❌ Failed: {$failureCount}");

        if (!empty($errors)) {
            $this->newLine();
            $this->error("🚨 Errors encountered:");
            foreach ($errors as $error) {
                $this->line("  • {$error['organization']}: {$error['error']}");
            }
        }

        if ($dryRun) {
            $this->newLine();
            $this->info('💡 To actually run the backfill, use: php artisan geographic:backfill');
        }

        return $failureCount === 0 ? 0 : 1;
    }
}
