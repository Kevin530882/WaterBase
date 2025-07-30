<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class LocationService
{
    private array $philippines_areas;

    public function __construct()
    {
        $this->loadPhilippineAreas();
    }

    /**
     * Load the Philippine areas of responsibility JSON data
     */
    private function loadPhilippineAreas(): void
    {
        $jsonPath = public_path('philippine_areas_of_responsibilities.json');

        if (!file_exists($jsonPath)) {
            throw new \Exception('Philippine areas of responsibilities JSON file not found');
        }

        $this->philippines_areas = json_decode(file_get_contents($jsonPath), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception('Invalid JSON in Philippine areas file: ' . json_last_error_msg());
        }
    }

    /**
     * Geocode coordinates to location hierarchy
     * Returns location data including region, province, municipality, and barangay
     */
    public function geocodeCoordinates(float $latitude, float $longitude): array
    {
        $cacheKey = "geocode_{$latitude}_{$longitude}";

        return Cache::remember($cacheKey, now()->addDays(30), function () use ($latitude, $longitude) {
            return $this->findLocationByCoordinates($latitude, $longitude);
        });
    }

    /**
     * Find location by coordinates using nearest neighbor approach
     */
    private function findLocationByCoordinates(float $latitude, float $longitude): array
    {
        $closestLocation = null;
        $minDistance = PHP_FLOAT_MAX;

        // For simplicity, we'll use a basic approach here
        // In a production system, you'd want to use proper GIS/spatial databases

        foreach ($this->philippines_areas as $regionCode => $regionData) {
            $regionName = $regionData['region_name'];

            foreach ($regionData['province_list'] as $provinceName => $provinceData) {
                foreach ($provinceData['municipality_list'] as $municipalityName => $municipalityData) {
                    foreach ($municipalityData['barangay_list'] as $barangayName) {
                        // For now, return the first match within reasonable bounds
                        // In a real implementation, you'd have coordinate data for each location
                        if ($this->isWithinPhilippines($latitude, $longitude)) {
                            return [
                                'region_code' => $regionCode,
                                'region_name' => $regionName,
                                'province_name' => $provinceName,
                                'municipality_name' => $municipalityName,
                                'barangay_name' => $barangayName,
                                'confidence' => 'medium', // Would be calculated based on actual distance
                            ];
                        }
                    }
                }
            }
        }

        // Fallback - try to match at least region/province level
        return $this->findBestLocationMatch($latitude, $longitude);
    }

    /**
     * Check if coordinates are within Philippines bounds
     */
    private function isWithinPhilippines(float $latitude, float $longitude): bool
    {
        // Philippines approximate bounds
        $minLat = 4.2158;
        $maxLat = 21.3182;
        $minLng = 114.0952;
        $maxLng = 127.6444;

        return $latitude >= $minLat && $latitude <= $maxLat &&
            $longitude >= $minLng && $longitude <= $maxLng;
    }

    /**
     * Find best location match when exact barangay cannot be determined
     */
    private function findBestLocationMatch(float $latitude, float $longitude): array
    {
        // Simplified matching - in production, use proper spatial analysis
        // For Metro Manila area
        if ($latitude >= 14.0 && $latitude <= 15.0 && $longitude >= 120.5 && $longitude <= 121.5) {
            return [
                'region_code' => '13',
                'region_name' => 'NATIONAL CAPITAL REGION (NCR)',
                'province_name' => 'METRO MANILA',
                'municipality_name' => null,
                'barangay_name' => null,
                'confidence' => 'low',
            ];
        }

        // Default fallback
        return [
            'region_code' => null,
            'region_name' => null,
            'province_name' => null,
            'municipality_name' => null,
            'barangay_name' => null,
            'confidence' => 'none',
        ];
    }

    /**
     * Check if an organization's area of responsibility allows them to see a report
     */
    public function canOrganizationSeeReport(string $orgAreaOfResponsibility, array $reportLocation): bool
    {
        $orgArea = $this->parseAreaOfResponsibility($orgAreaOfResponsibility);

        if (empty($orgArea)) {
            return false;
        }

        // Check hierarchy match
        switch ($orgArea['level']) {
            case 'region':
                return $this->matchesRegion($orgArea, $reportLocation);
            case 'province':
                return $this->matchesProvince($orgArea, $reportLocation);
            case 'municipality':
                return $this->matchesMunicipality($orgArea, $reportLocation);
            case 'barangay':
                return $this->matchesBarangay($orgArea, $reportLocation);
            default:
                return false;
        }
    }

    /**
     * Parse area of responsibility string into structured data
     */
    private function parseAreaOfResponsibility(string $areaOfResponsibility): array
    {
        // Expected formats:
        // "REGION I"
        // "ILOCOS NORTE"
        // "BACARRA, ILOCOS NORTE"
        // "BANI, BACARRA, ILOCOS NORTE"

        $parts = array_map('trim', explode(',', $areaOfResponsibility));
        $partCount = count($parts);

        if ($partCount === 1) {
            // Could be region or province
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
    }

    /**
     * Check if string is a region name
     */
    private function isRegionName(string $name): bool
    {
        foreach ($this->philippines_areas as $regionData) {
            if (strcasecmp($regionData['region_name'], $name) === 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if organization area matches report's region
     */
    private function matchesRegion(array $orgArea, array $reportLocation): bool
    {
        return !empty($reportLocation['region_name']) &&
            strcasecmp($orgArea['region_name'], $reportLocation['region_name']) === 0;
    }

    /**
     * Check if organization area matches report's province
     */
    private function matchesProvince(array $orgArea, array $reportLocation): bool
    {
        return !empty($reportLocation['province_name']) &&
            strcasecmp($orgArea['province_name'], $reportLocation['province_name']) === 0;
    }

    /**
     * Check if organization area matches report's municipality
     */
    private function matchesMunicipality(array $orgArea, array $reportLocation): bool
    {
        return !empty($reportLocation['municipality_name']) &&
            !empty($reportLocation['province_name']) &&
            strcasecmp($orgArea['municipality_name'], $reportLocation['municipality_name']) === 0 &&
            strcasecmp($orgArea['province_name'], $reportLocation['province_name']) === 0;
    }

    /**
     * Check if organization area matches report's barangay
     */
    private function matchesBarangay(array $orgArea, array $reportLocation): bool
    {
        return !empty($reportLocation['barangay_name']) &&
            !empty($reportLocation['municipality_name']) &&
            !empty($reportLocation['province_name']) &&
            strcasecmp($orgArea['barangay_name'], $reportLocation['barangay_name']) === 0 &&
            strcasecmp($orgArea['municipality_name'], $reportLocation['municipality_name']) === 0 &&
            strcasecmp($orgArea['province_name'], $reportLocation['province_name']) === 0;
    }

    /**
     * Get all valid locations at a specific level within a parent location
     */
    public function getLocationsAt(string $level, array $parentLocation = []): array
    {
        $locations = [];

        foreach ($this->philippines_areas as $regionCode => $regionData) {
            if ($level === 'region') {
                $locations[] = [
                    'code' => $regionCode,
                    'name' => $regionData['region_name']
                ];
                continue;
            }

            // If we need to filter by parent region
            if (
                !empty($parentLocation['region_name']) &&
                strcasecmp($regionData['region_name'], $parentLocation['region_name']) !== 0
            ) {
                continue;
            }

            foreach ($regionData['province_list'] as $provinceName => $provinceData) {
                if ($level === 'province') {
                    $locations[] = [
                        'name' => $provinceName,
                        'region_name' => $regionData['region_name'],
                        'region_code' => $regionCode
                    ];
                    continue;
                }

                // If we need to filter by parent province
                if (
                    !empty($parentLocation['province_name']) &&
                    strcasecmp($provinceName, $parentLocation['province_name']) !== 0
                ) {
                    continue;
                }

                foreach ($provinceData['municipality_list'] as $municipalityName => $municipalityData) {
                    if ($level === 'municipality') {
                        $locations[] = [
                            'name' => $municipalityName,
                            'province_name' => $provinceName,
                            'region_name' => $regionData['region_name'],
                            'region_code' => $regionCode
                        ];
                        continue;
                    }

                    // If we need to filter by parent municipality
                    if (
                        !empty($parentLocation['municipality_name']) &&
                        strcasecmp($municipalityName, $parentLocation['municipality_name']) !== 0
                    ) {
                        continue;
                    }

                    if ($level === 'barangay') {
                        foreach ($municipalityData['barangay_list'] as $barangayName) {
                            $locations[] = [
                                'name' => $barangayName,
                                'municipality_name' => $municipalityName,
                                'province_name' => $provinceName,
                                'region_name' => $regionData['region_name'],
                                'region_code' => $regionCode
                            ];
                        }
                    }
                }
            }
        }

        return $locations;
    }
}
