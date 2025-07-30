<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NominatimService
{
    private static float $lastRequestTime = 0;

    /**
     * Reverse geocode coordinates to get address information
     */
    public static function reverseGeocode(float $latitude, float $longitude): array
    {
        $cacheKey = "nominatim_reverse_{$latitude}_{$longitude}";

        return Cache::remember($cacheKey, now()->addDays(30), function () use ($latitude, $longitude) {
            return self::performReverseGeocode($latitude, $longitude);
        });
    }

    /**
     * Forward geocode address to get coordinates
     */
    public static function forwardGeocode(string $address): array
    {
        $cacheKey = "nominatim_forward_" . md5($address);

        return Cache::remember($cacheKey, now()->addDays(7), function () use ($address) {
            return self::performForwardGeocode($address);
        });
    }

    /**
     * Verify if coordinates match the provided address
     */
    public static function verifyAddressCoordinates(string $userAddress, float $latitude, float $longitude): array
    {
        try {
            // Get actual location from coordinates
            $reverseResult = self::reverseGeocode($latitude, $longitude);

            if (!$reverseResult['success']) {
                return [
                    'is_valid' => false,
                    'confidence' => 'none',
                    'message' => 'Could not reverse geocode coordinates',
                    'geocoded_address' => null,
                    'distance' => null
                ];
            }

            // Compare addresses using fuzzy matching
            $geocodedAddress = $reverseResult['display_name'];
            $similarity = self::calculateAddressSimilarity($userAddress, $geocodedAddress);

            // Get forward geocode of user address for distance calculation
            $forwardResult = self::forwardGeocode($userAddress);
            $distance = null;

            if ($forwardResult['success']) {
                $distance = self::calculateDistance(
                    $latitude,
                    $longitude,
                    (float) $forwardResult['lat'],
                    (float) $forwardResult['lon']
                );
            }

            // Determine validation result
            $isValid = false;
            $confidence = 'none';

            if ($similarity >= 0.7 || ($distance !== null && $distance <= 5000)) { // 5km tolerance
                $isValid = true;
                $confidence = 'high';
            } elseif ($similarity >= 0.5 || ($distance !== null && $distance <= 10000)) { // 10km tolerance
                $isValid = true;
                $confidence = 'medium';
            } elseif ($similarity >= 0.3 || ($distance !== null && $distance <= 50000)) { // 50km tolerance
                $confidence = 'low';
            }

            return [
                'is_valid' => $isValid,
                'confidence' => $confidence,
                'similarity_score' => $similarity,
                'distance_meters' => $distance,
                'geocoded_address' => $geocodedAddress,
                'user_address' => $userAddress,
                'message' => self::getValidationMessage($isValid, $confidence, $similarity, $distance)
            ];

        } catch (\Exception $e) {
            Log::error('Error in address verification', [
                'user_address' => $userAddress,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'error' => $e->getMessage()
            ]);

            return [
                'is_valid' => false,
                'confidence' => 'error',
                'message' => 'Error during verification: ' . $e->getMessage(),
                'geocoded_address' => null,
                'distance' => null
            ];
        }
    }

    /**
     * Perform actual reverse geocoding API call
     */
    private static function performReverseGeocode(float $latitude, float $longitude): array
    {
        try {
            self::respectRateLimit();

            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'WaterBase-App/1.0 (Laravel Application)'
                ])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'format' => 'json',
                    'lat' => $latitude,
                    'lon' => $longitude,
                    'addressdetails' => 1,
                    'extratags' => 1,
                    'namedetails' => 1,
                    'zoom' => 18
                ]);

            if (!$response->successful()) {
                Log::warning('Nominatim reverse geocoding failed', [
                    'status' => $response->status(),
                    'latitude' => $latitude,
                    'longitude' => $longitude
                ]);

                return [
                    'success' => false,
                    'error' => 'API request failed'
                ];
            }

            $data = $response->json();

            if (empty($data)) {
                return [
                    'success' => false,
                    'error' => 'No results found'
                ];
            }

            return [
                'success' => true,
                'display_name' => $data['display_name'] ?? '',
                'address' => $data['address'] ?? [],
                'importance' => $data['importance'] ?? 0,
                'place_id' => $data['place_id'] ?? null,
                'lat' => $data['lat'] ?? $latitude,
                'lon' => $data['lon'] ?? $longitude
            ];

        } catch (\Exception $e) {
            Log::error('Exception in reverse geocoding', [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Perform actual forward geocoding API call
     */
    private static function performForwardGeocode(string $address): array
    {
        try {
            self::respectRateLimit();

            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'WaterBase-App/1.0 (Laravel Application)'
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'format' => 'json',
                    'q' => $address,
                    'countrycodes' => 'ph', // Philippines only
                    'addressdetails' => 1,
                    'limit' => 1,
                    'extratags' => 1
                ]);

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => 'API request failed'
                ];
            }

            $data = $response->json();

            if (empty($data)) {
                return [
                    'success' => false,
                    'error' => 'Address not found'
                ];
            }

            $result = $data[0];

            return [
                'success' => true,
                'lat' => $result['lat'] ?? null,
                'lon' => $result['lon'] ?? null,
                'display_name' => $result['display_name'] ?? '',
                'importance' => $result['importance'] ?? 0
            ];

        } catch (\Exception $e) {
            Log::error('Exception in forward geocoding', [
                'address' => $address,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Respect Nominatim rate limiting (1 request per second)
     */
    private static function respectRateLimit(): void
    {
        $now = microtime(true);
        $timeSinceLastRequest = $now - self::$lastRequestTime;

        if ($timeSinceLastRequest < 1.0) {
            $sleepTime = (1.0 - $timeSinceLastRequest) * 1000000; // Convert to microseconds
            usleep((int) $sleepTime);
        }

        self::$lastRequestTime = microtime(true);
    }

    /**
     * Calculate similarity between two addresses using fuzzy matching
     */
    private static function calculateAddressSimilarity(string $address1, string $address2): float
    {
        // Normalize addresses for comparison
        $addr1 = self::normalizeAddress($address1);
        $addr2 = self::normalizeAddress($address2);

        // Use Levenshtein distance for similarity
        $maxLen = max(strlen($addr1), strlen($addr2));

        if ($maxLen === 0) {
            return 1.0;
        }

        $distance = levenshtein($addr1, $addr2);
        $similarity = 1 - ($distance / $maxLen);

        // Boost similarity if key location names match
        $boost = self::calculateLocationNameBoost($addr1, $addr2);

        return min(1.0, $similarity + $boost);
    }

    /**
     * Normalize address string for comparison
     */
    private static function normalizeAddress(string $address): string
    {
        $normalized = strtolower($address);
        $normalized = preg_replace('/[^a-z0-9\s]/', '', $normalized);
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        return trim($normalized);
    }

    /**
     * Calculate boost score based on matching location names
     */
    private static function calculateLocationNameBoost(string $addr1, string $addr2): float
    {
        $boost = 0.0;

        // Common Philippine location keywords
        $keywords = [
            'manila',
            'cebu',
            'davao',
            'quezon',
            'makati',
            'taguig',
            'pasig',
            'city',
            'barangay',
            'brgy',
            'municipality',
            'province'
        ];

        foreach ($keywords as $keyword) {
            if (strpos($addr1, $keyword) !== false && strpos($addr2, $keyword) !== false) {
                $boost += 0.1;
            }
        }

        return min(0.3, $boost); // Max 30% boost
    }

    /**
     * Calculate distance between two coordinates in meters
     */
    private static function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // Earth's radius in meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Generate validation message based on results
     */
    private static function getValidationMessage(bool $isValid, string $confidence, float $similarity, ?float $distance): string
    {
        if (!$isValid) {
            if ($distance !== null) {
                return "Address and coordinates don't match. Distance: " . round($distance / 1000, 2) . "km apart.";
            }
            return "Address and coordinates don't match. Similarity: " . round($similarity * 100, 1) . "%.";
        }

        switch ($confidence) {
            case 'high':
                return "Address and coordinates match well.";
            case 'medium':
                return "Address and coordinates are reasonably close.";
            case 'low':
                return "Address and coordinates are within acceptable range but may need review.";
            default:
                return "Validation completed.";
        }
    }
}
