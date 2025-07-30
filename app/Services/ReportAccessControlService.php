<?php

namespace App\Services;

use App\Models\Report;
use App\Models\User;
use App\Models\ReportGroup;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class ReportAccessControlService
{
    private LocationService $locationService;
    private ReportGroupingService $groupingService;

    public function __construct(
        LocationService $locationService,
        ReportGroupingService $groupingService
    ) {
        $this->locationService = $locationService;
        $this->groupingService = $groupingService;
    }

    /**
     * Get reports that the user's organization can access
     */
    public function getAccessibleReports(User $user)
    {
        // If user doesn't have an area of responsibility, return empty query
        if (empty($user->areaOfResponsibility)) {
            return Report::whereRaw('1 = 0'); // Always false condition
        }

        return Report::where(function (Builder $query) use ($user) {
            $this->applyLocationFilter($query, $user->areaOfResponsibility);
        });
    }

    /**
     * Apply location-based filtering to query
     */
    private function applyLocationFilter(Builder $query, string $areaOfResponsibility): void
    {
        $orgArea = $this->parseAreaOfResponsibility($areaOfResponsibility);

        if (empty($orgArea)) {
            $query->whereRaw('1 = 0'); // No access
            return;
        }

        switch ($orgArea['level']) {
            case 'region':
                $this->applyRegionFilter($query, $orgArea);
                break;
            case 'province':
                $this->applyProvinceFilter($query, $orgArea);
                break;
            case 'municipality':
                $this->applyMunicipalityFilter($query, $orgArea);
                break;
            case 'barangay':
                $this->applyBarangayFilter($query, $orgArea);
                break;
            default:
                $query->whereRaw('1 = 0'); // No access
        }
    }

    /**
     * Apply region-level filtering
     */
    private function applyRegionFilter(Builder $query, array $orgArea): void
    {
        $query->where('region_name', $orgArea['region_name']);
    }

    /**
     * Apply province-level filtering (includes access to all municipalities and barangays in province)
     */
    private function applyProvinceFilter(Builder $query, array $orgArea): void
    {
        $query->where('province_name', $orgArea['province_name']);
    }

    /**
     * Apply municipality-level filtering (includes access to all barangays in municipality)
     */
    private function applyMunicipalityFilter(Builder $query, array $orgArea): void
    {
        $query->where('municipality_name', $orgArea['municipality_name'])
            ->where('province_name', $orgArea['province_name']);
    }

    /**
     * Apply barangay-level filtering (most specific access)
     */
    private function applyBarangayFilter(Builder $query, array $orgArea): void
    {
        $query->where('barangay_name', $orgArea['barangay_name'])
            ->where('municipality_name', $orgArea['municipality_name'])
            ->where('province_name', $orgArea['province_name']);
    }

    /**
     * Check if a user can see a specific report
     */
    public function canUserSeeReport(User $user, Report $report): bool
    {
        if (empty($user->areaOfResponsibility)) {
            return false;
        }

        // If report is not geocoded, deny access for security
        if (!$report->isGeocoded()) {
            return false;
        }

        return $this->locationService->canOrganizationSeeReport(
            $user->areaOfResponsibility,
            $report->getLocationHierarchy()
        );
    }

    /**
     * Geocode and update location fields for a report with address verification
     */
    public function geocodeReport(Report $report): bool
    {
        try {
            // First, verify that address and coordinates match using Nominatim
            $verification = NominatimService::verifyAddressCoordinates(
                $report->address,
                (float) $report->latitude,
                (float) $report->longitude
            );

            // Log the verification result
            \Log::info('Address verification for report', [
                'report_id' => $report->id,
                'verification' => $verification
            ]);

            // If verification fails completely, don't geocode
            if ($verification['confidence'] === 'error' || $verification['confidence'] === 'none') {
                \Log::warning('Report failed address verification', [
                    'report_id' => $report->id,
                    'message' => $verification['message']
                ]);

                // Mark as suspicious but don't completely reject
                $report->update([
                    'verification_status' => 'suspicious',
                    'verification_notes' => $verification['message'],
                    'verification_confidence' => $verification['confidence']
                ]);

                return false;
            }

            // Use existing location service for hierarchical geocoding
            $locationData = $this->locationService->geocodeCoordinates(
                (float) $report->latitude,
                (float) $report->longitude
            );

            if ($locationData['confidence'] === 'none') {
                return false;
            }

            // Update report with both geocoding and verification data
            $report->update([
                'region_code' => $locationData['region_code'],
                'region_name' => $locationData['region_name'],
                'province_name' => $locationData['province_name'],
                'municipality_name' => $locationData['municipality_name'],
                'barangay_name' => $locationData['barangay_name'],
                'geocoded_at' => now(),
                'verification_status' => $verification['is_valid'] ? 'verified' : 'flagged',
                'verification_confidence' => $verification['confidence'],
                'verification_notes' => $verification['message'],
                'geocoded_address' => $verification['geocoded_address'] ?? null,
                'address_similarity' => $verification['similarity_score'] ?? null,
                'coordinate_distance' => $verification['distance_meters'] ?? null,
                'verification_at' => now(),
            ]);

            // Only process for grouping if verification passed
            if ($verification['is_valid']) {
                $this->groupingService->processNewReport($report);
            }

            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to geocode report', [
                'report_id' => $report->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Parse area of responsibility string
     */
    private function parseAreaOfResponsibility(string $areaOfResponsibility): array
    {
        $cacheKey = "parsed_aor_" . md5($areaOfResponsibility);

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($areaOfResponsibility) {
            // Expected formats:
            // "REGION I"
            // "ILOCOS NORTE"
            // "BACARRA, ILOCOS NORTE"
            // "BANI, BACARRA, ILOCOS NORTE"

            $parts = array_map('trim', explode(',', $areaOfResponsibility));
            $partCount = count($parts);

            if ($partCount === 1) {
                // Could be region or province - check if it's a known region
                if ($this->isRegionName($parts[0])) {
                    return ['level' => 'region', 'region_name' => $parts[0]];
                } else {
                    return ['level' => 'province', 'province_name' => $parts[0]];
                }
            } elseif ($partCount === 2) {
                // Municipality, Province
                return [
                    'level' => 'municipality',
                    'municipality_name' => $parts[0],
                    'province_name' => $parts[1]
                ];
            } elseif ($partCount === 3) {
                // Barangay, Municipality, Province
                return [
                    'level' => 'barangay',
                    'barangay_name' => $parts[0],
                    'municipality_name' => $parts[1],
                    'province_name' => $parts[2]
                ];
            }

            return [];
        });
    }

    /**
     * Check if string is a region name
     */
    private function isRegionName(string $name): bool
    {
        $regions = [
            'REGION I',
            'REGION II',
            'REGION III',
            'REGION IV-A',
            'REGION IV-B',
            'REGION V',
            'REGION VI',
            'REGION VII',
            'REGION VIII',
            'REGION IX',
            'REGION X',
            'REGION XI',
            'REGION XII',
            'REGION XIII',
            'NATIONAL CAPITAL REGION (NCR)',
            'CORDILLERA ADMINISTRATIVE REGION (CAR)',
            'AUTONOMOUS REGION IN MUSLIM MINDANAO (ARMM)',
            'BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO (BARMM)'
        ];

        return in_array(strtoupper($name), $regions);
    }

    /**
     * Get accessible report groups for a user
     */
    public function getAccessibleReportGroups(User $user)
    {
        $accessibleReportIds = $this->getAccessibleReports($user)->pluck('id');

        return ReportGroup::whereHas('reports', function (Builder $query) use ($accessibleReportIds) {
            $query->whereIn('id', $accessibleReportIds);
        });
    }

    /**
     * Batch geocode reports that haven't been processed
     */
    public function batchGeocodeReports(int $limit = 100): array
    {
        $results = [
            'processed' => 0,
            'success' => 0,
            'failed' => 0,
            'errors' => []
        ];

        $reports = Report::whereNull('geocoded_at')
            ->limit($limit)
            ->get();

        foreach ($reports as $report) {
            $results['processed']++;

            if ($this->geocodeReport($report)) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = "Failed to geocode report ID: {$report->id}";
            }
        }

        return $results;
    }

    /**
     * Get location statistics for reporting
     */
    public function getLocationStatistics(): array
    {
        return [
            'total_reports' => Report::count(),
            'geocoded_reports' => Report::whereNotNull('geocoded_at')->count(),
            'reports_by_region' => Report::whereNotNull('region_name')
                ->selectRaw('region_name, COUNT(*) as count')
                ->groupBy('region_name')
                ->orderBy('count', 'desc')
                ->get()
                ->toArray(),
            'reports_by_province' => Report::whereNotNull('province_name')
                ->selectRaw('province_name, COUNT(*) as count')
                ->groupBy('province_name')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get()
                ->toArray(),
        ];
    }

    /**
     * Validate area of responsibility format
     */
    public function validateAreaOfResponsibility(string $areaOfResponsibility): array
    {
        $parsed = $this->parseAreaOfResponsibility($areaOfResponsibility);

        if (empty($parsed)) {
            return [
                'valid' => false,
                'error' => 'Invalid area of responsibility format'
            ];
        }

        // Additional validation could be added here to check if the location exists
        // in the Philippine areas data

        return [
            'valid' => true,
            'level' => $parsed['level'],
            'parsed' => $parsed
        ];
    }
}
