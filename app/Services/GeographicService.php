<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class GeographicService
{
    private const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

    /**
     * Register or update an organization's area of responsibility with geographic boundaries
     *
     * @param int $orgId The organization's user ID
     * @param string $areaString The area description (e.g., "Cebu City, Cebu, Region 7")
     * @return array Result with success status and any error messages
     */
    public function registerAreaOfResponsibility(int $orgId, string $areaString): array
    {
        try {
            // Normalize the area string
            $normalizedArea = strtoupper(trim($areaString));

            // Build Nominatim query URL
            $url = self::NOMINATIM_BASE_URL . '/search?' . http_build_query([
                'q' => $areaString,
                'format' => 'json',
                'polygon_geojson' => '1',
                'addressdetails' => '1',
                'limit' => '1'
            ]);

            Log::info('Fetching geographic data for area', [
                'area' => $areaString,
                'url' => $url
            ]);

            // Make the API request with timeout and error handling
            // Note: In development, we disable SSL verification to avoid certificate issues
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'WaterBase/1.0 (contact@waterbase.app)'
                ])
                ->withOptions([
                    'verify' => app()->environment('production'), // Only verify SSL in production
                ])
                ->get($url);

            if (!$response->successful()) {
                Log::error('Nominatim API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [
                    'success' => false,
                    'error' => 'Failed to fetch geographic data from Nominatim API'
                ];
            }

            $data = $response->json();

            if (empty($data)) {
                Log::warning('No results found for area', ['area' => $areaString]);
                return [
                    'success' => false,
                    'error' => 'No geographic data found for the specified area'
                ];
            }

            $result = $data[0];

            // Extract bounding box coordinates
            if (!isset($result['boundingbox']) || count($result['boundingbox']) < 4) {
                Log::warning('Invalid bounding box data', ['result' => $result]);
                return [
                    'success' => false,
                    'error' => 'Invalid geographic boundaries received'
                ];
            }

            $boundingBox = $result['boundingbox'];
            $south = (float) $boundingBox[0];
            $north = (float) $boundingBox[1];
            $west = (float) $boundingBox[2];
            $east = (float) $boundingBox[3];

            // Validate coordinates
            if (
                $south < -90 || $south > 90 || $north < -90 || $north > 90 ||
                $west < -180 || $west > 180 || $east < -180 || $east > 180
            ) {
                Log::warning('Invalid coordinates', [
                    'south' => $south,
                    'north' => $north,
                    'west' => $west,
                    'east' => $east
                ]);
                return [
                    'success' => false,
                    'error' => 'Invalid coordinate values received'
                ];
            }

            // Update the user record
            $updated = User::where('id', $orgId)->update([
                'areaOfResponsibility' => $normalizedArea,
                'bbox_south' => $south,
                'bbox_north' => $north,
                'bbox_west' => $west,
                'bbox_east' => $east,
            ]);

            if (!$updated) {
                Log::error('Failed to update user with geographic data', ['org_id' => $orgId]);
                return [
                    'success' => false,
                    'error' => 'Failed to update organization record'
                ];
            }

            Log::info('Successfully registered area of responsibility', [
                'org_id' => $orgId,
                'area' => $normalizedArea,
                'bbox' => compact('south', 'north', 'west', 'east')
            ]);

            return [
                'success' => true,
                'area' => $normalizedArea,
                'bounding_box' => compact('south', 'north', 'west', 'east'),
                'display_name' => $result['display_name'] ?? null
            ];

        } catch (\Exception $e) {
            Log::error('Error in registerAreaOfResponsibility', [
                'org_id' => $orgId,
                'area' => $areaString,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while processing the area'
            ];
        }
    }

    /**
     * Find organizations that should receive a report based on the report's address
     *
     * @param string $reportAddress The address where the report was made
     * @return array Result with matching organizations and coordinates
     */
    public function findOrgsForReport(string $reportAddress): array
    {
        try {
            // Forward-geocode the report address
            $url = self::NOMINATIM_BASE_URL . '/search?' . http_build_query([
                'q' => $reportAddress,
                'format' => 'json',
                'addressdetails' => '1',
                'limit' => '1'
            ]);

            Log::info('Geocoding report address', [
                'address' => $reportAddress,
                'url' => $url
            ]);

            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'WaterBase/1.0 (contact@waterbase.app)'
                ])
                ->get($url);

            if (!$response->successful()) {
                Log::error('Geocoding API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [
                    'success' => false,
                    'error' => 'Failed to geocode report address'
                ];
            }

            $data = $response->json();

            if (empty($data)) {
                Log::warning('No geocoding results found', ['address' => $reportAddress]);
                return [
                    'success' => false,
                    'error' => 'Could not find coordinates for the report address'
                ];
            }

            $result = $data[0];
            $lat = (float) $result['lat'];
            $lon = (float) $result['lon'];

            // Validate coordinates
            if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
                Log::warning('Invalid geocoded coordinates', ['lat' => $lat, 'lon' => $lon]);
                return [
                    'success' => false,
                    'error' => 'Invalid coordinates received from geocoding'
                ];
            }

            // Find organizations whose bounding box contains this point
            $matchingOrgs = User::select('id', 'organization', 'areaOfResponsibility', 'firstName', 'lastName', 'email')
                ->whereNotNull('bbox_south')
                ->whereNotNull('bbox_north')
                ->whereNotNull('bbox_west')
                ->whereNotNull('bbox_east')
                ->where('bbox_south', '<=', $lat)
                ->where('bbox_north', '>=', $lat)
                ->where('bbox_west', '<=', $lon)
                ->where('bbox_east', '>=', $lon)
                ->get();

            Log::info('Found matching organizations for report', [
                'address' => $reportAddress,
                'coordinates' => compact('lat', 'lon'),
                'matching_count' => $matchingOrgs->count(),
                'org_ids' => $matchingOrgs->pluck('id')->toArray()
            ]);

            return [
                'success' => true,
                'coordinates' => compact('lat', 'lon'),
                'geocoded_address' => $result['display_name'] ?? $reportAddress,
                'organizations' => $matchingOrgs->toArray()
            ];

        } catch (\Exception $e) {
            Log::error('Error in findOrgsForReport', [
                'address' => $reportAddress,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while finding organizations'
            ];
        }
    }

    /**
     * Get all organizations with their geographic boundaries
     *
     * @return array List of organizations with their areas and bounding boxes
     */
    public function getAllOrgsWithBoundaries(): array
    {
        try {
            $orgs = User::select([
                'id',
                'organization',
                'areaOfResponsibility',
                'bbox_south',
                'bbox_north',
                'bbox_west',
                'bbox_east',
                'firstName',
                'lastName'
            ])
                ->whereNotNull('areaOfResponsibility')
                ->get();

            return [
                'success' => true,
                'organizations' => $orgs->toArray()
            ];

        } catch (\Exception $e) {
            Log::error('Error getting organizations with boundaries', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Failed to retrieve organizations'
            ];
        }
    }

    /**
     * Test if a point is within an organization's area
     *
     * @param int $orgId Organization user ID
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @return bool True if point is within the organization's area
     */
    public function isPointInOrgArea(int $orgId, float $lat, float $lon): bool
    {
        try {
            $org = User::select(['bbox_south', 'bbox_north', 'bbox_west', 'bbox_east'])
                ->where('id', $orgId)
                ->whereNotNull('bbox_south')
                ->first();

            if (!$org) {
                return false;
            }

            return $lat >= $org->bbox_south &&
                $lat <= $org->bbox_north &&
                $lon >= $org->bbox_west &&
                $lon <= $org->bbox_east;

        } catch (\Exception $e) {
            Log::error('Error checking point in org area', [
                'org_id' => $orgId,
                'coordinates' => compact('lat', 'lon'),
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}
