<?php

namespace App\Http\Controllers;

use App\Services\NominatimService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AddressVerificationController extends Controller
{
    /**
     * Test endpoint for address verification
     */
    public function testVerification(Request $request): JsonResponse
    {
        $request->validate([
            'address' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $verification = NominatimService::verifyAddressCoordinates(
            $request->address,
            (float) $request->latitude,
            (float) $request->longitude
        );

        return response()->json([
            'status' => 'success',
            'verification' => $verification
        ]);
    }

    /**
     * Test reverse geocoding
     */
    public function testReverseGeocode(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $result = NominatimService::reverseGeocode(
            (float) $request->latitude,
            (float) $request->longitude
        );

        return response()->json([
            'status' => 'success',
            'result' => $result
        ]);
    }

    /**
     * Test forward geocoding
     */
    public function testForwardGeocode(Request $request): JsonResponse
    {
        $request->validate([
            'address' => 'required|string',
        ]);

        $result = NominatimService::forwardGeocode($request->address);

        return response()->json([
            'status' => 'success',
            'result' => $result
        ]);
    }
}
