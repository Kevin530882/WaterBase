<?php

namespace App\Http\Controllers;

use App\Services\NominatimService;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    protected $nominatimService;

    public function __construct(NominatimService $nominatimService)
    {
        $this->nominatimService = $nominatimService;
    }

    public function search(Request $request)
    {
        $request->validate([
            'query' => 'required|string|min:3|max:255'
        ]);

        $results = $this->nominatimService->searchAddress($request->query);

        return response()->json([
            'success' => true,
            'data' => $results
        ]);
    }
}
