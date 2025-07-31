<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class NominatimService
{
    private $baseUrl = 'https://nominatim.openstreetmap.org';
    private $lastRequestTime = 0;

    public function searchAddress($query)
    {
        try {
            // Rate limiting - Nominatim requires 1 request per second
            $this->enforceRateLimit();

            $cacheKey = 'nominatim_search_' . md5($query);

            return Cache::remember($cacheKey, 3600, function () use ($query) {
                $response = Http::timeout(10)
                    ->withHeaders([
                        'User-Agent' => 'WaterBase Application (contact@waterbase.app)'
                    ])
                    ->get($this->baseUrl . '/search', [
                        'q' => $query,
                        'format' => 'json',
                        'addressdetails' => 1,
                        'limit' => 5,
                        'countrycodes' => 'ph', // Limit to Philippines
                    ]);

                if ($response->successful()) {
                    return $response->json();
                } else {
                    Log::warning('Nominatim search failed', [
                        'query' => $query,
                        'status' => $response->status(),
                        'response' => $response->body()
                    ]);
                    return [];
                }
            });
        } catch (\Exception $e) {
            Log::error('Nominatim search error', [
                'query' => $query,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    private function enforceRateLimit()
    {
        $currentTime = microtime(true);
        $timeSinceLastRequest = $currentTime - $this->lastRequestTime;

        if ($timeSinceLastRequest < 1.0) {
            $sleepTime = 1.0 - $timeSinceLastRequest;
            usleep($sleepTime * 1000000); // Convert to microseconds
        }

        $this->lastRequestTime = microtime(true);
    }
}
