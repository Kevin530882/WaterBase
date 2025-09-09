<?php

namespace App\Http\Controllers;

use App\Services\GeographicService;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class GeographicController extends Controller
{
    protected GeographicService $geographicService;

    public function __construct(GeographicService $geographicService)
    {
        $this->geographicService = $geographicService;
    }

    /**
     * Register or update an organization's area of responsibility
     */
    public function registerAreaOfResponsibility(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'org_id' => 'required|integer|exists:users,id',
                'area' => 'required|string|max:500|min:3'
            ]);

            $result = $this->geographicService->registerAreaOfResponsibility(
                $validated['org_id'],
                $validated['area']
            );

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Area of responsibility registered successfully',
                    'data' => $result
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error in registerAreaOfResponsibility endpoint', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Update current user's area of responsibility
     */
    public function updateMyArea(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validated = $request->validate([
                'area' => 'required|string|max:500|min:3'
            ]);

            $result = $this->geographicService->registerAreaOfResponsibility(
                $user->id,
                $validated['area']
            );

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Your area of responsibility has been updated successfully',
                    'data' => $result
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error in updateMyArea endpoint', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Find organizations for a specific report address
     */
    public function findOrgsForReport(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'address' => 'required|string|max:500|min:5'
            ]);

            $result = $this->geographicService->findOrgsForReport($validated['address']);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Organizations found successfully',
                    'data' => $result
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error in findOrgsForReport endpoint', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Get all organizations with their geographic boundaries
     */
    public function getAllOrgsWithBoundaries(): JsonResponse
    {
        try {
            $result = $this->geographicService->getAllOrgsWithBoundaries();

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'data' => $result['organizations']
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Error in getAllOrgsWithBoundaries endpoint', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Test if a point is within an organization's area
     */
    public function testPointInArea(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'org_id' => 'required|integer|exists:users,id',
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180'
            ]);

            $isWithin = $this->geographicService->isPointInOrgArea(
                $validated['org_id'],
                $validated['latitude'],
                $validated['longitude']
            );

            return response()->json([
                'success' => true,
                'is_within_area' => $isWithin,
                'coordinates' => [
                    'latitude' => $validated['latitude'],
                    'longitude' => $validated['longitude']
                ]
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error in testPointInArea endpoint', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Geocode an address to get coordinates
     */
    public function geocodeAddress(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'address' => 'required|string|max:500|min:5'
            ]);

            // Use the findOrgsForReport method to get geocoding results
            $result = $this->geographicService->findOrgsForReport($validated['address']);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'coordinates' => $result['coordinates'],
                    'geocoded_address' => $result['geocoded_address'],
                    'organizations_count' => count($result['organizations'])
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error in geocodeAddress endpoint', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred'
            ], 500);
        }
    }
}
