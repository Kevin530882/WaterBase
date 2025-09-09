/**
 * Geographic Service Client
 * JavaScript/TypeScript utility for interacting with geographic APIs
 */

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface BoundingBox {
    south: number;
    north: number;
    west: number;
    east: number;
}

interface Organization {
    id: number;
    organization?: string;
    areaOfResponsibility?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    bbox_south?: number;
    bbox_north?: number;
    bbox_west?: number;
    bbox_east?: number;
}

interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    errors?: Record<string, string[]>;
}

class GeographicService {
    private baseUrl: string;
    private authToken: string | null = null;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    /**
     * Set authentication token for API requests
     */
    setAuthToken(token: string): void {
        this.authToken = token;
    }

    /**
     * Make authenticated API request
     */
    private async makeRequest<T = any>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('API Error:', data);
                return {
                    success: false,
                    message: data.message || 'Request failed',
                    errors: data.errors
                };
            }

            return data;
        } catch (error) {
            console.error('Network Error:', error);
            return {
                success: false,
                message: 'Network error occurred',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Register or update an organization's area of responsibility with geographic boundaries
     */
    async registerAreaOfResponsibility(orgId: number, areaString: string): Promise<ApiResponse> {
        return this.makeRequest('/geographic/register-area', {
            method: 'POST',
            body: JSON.stringify({
                org_id: orgId,
                area: areaString
            })
        });
    }

    /**
     * Update current user's area of responsibility
     */
    async updateMyArea(areaString: string): Promise<ApiResponse> {
        return this.makeRequest('/geographic/update-my-area', {
            method: 'POST',
            body: JSON.stringify({
                area: areaString
            })
        });
    }

    /**
     * Find organizations that should see a report based on address
     */
    async findOrgsForReport(reportAddress: string): Promise<ApiResponse<{
        coordinates: Coordinates;
        geocoded_address: string;
        organizations: Organization[];
    }>> {
        return this.makeRequest('/geographic/find-orgs', {
            method: 'POST',
            body: JSON.stringify({
                address: reportAddress
            })
        });
    }

    /**
     * Get all organizations with their geographic boundaries
     */
    async getAllOrgsWithBoundaries(): Promise<ApiResponse<Organization[]>> {
        return this.makeRequest('/geographic/organizations', {
            method: 'GET'
        });
    }

    /**
     * Test if a point is within an organization's area
     */
    async testPointInArea(
        orgId: number,
        latitude: number,
        longitude: number
    ): Promise<ApiResponse<{
        is_within_area: boolean;
        coordinates: Coordinates;
    }>> {
        return this.makeRequest('/geographic/test-point', {
            method: 'POST',
            body: JSON.stringify({
                org_id: orgId,
                latitude,
                longitude
            })
        });
    }

    /**
     * Geocode an address to get coordinates
     */
    async geocodeAddress(address: string): Promise<ApiResponse<{
        coordinates: Coordinates;
        geocoded_address: string;
        organizations_count: number;
    }>> {
        return this.makeRequest('/geographic/geocode', {
            method: 'POST',
            body: JSON.stringify({
                address
            })
        });
    }

    /**
     * Get organizations for a specific report address (via reports endpoint)
     */
    async getOrganizationsForReport(address: string): Promise<ApiResponse> {
        return this.makeRequest('/reports/organizations', {
            method: 'POST',
            body: JSON.stringify({
                address
            })
        });
    }
}

// Utility functions for geographic calculations

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Check if a point is within a bounding box
 */
function isPointInBoundingBox(point: Coordinates, bbox: BoundingBox): boolean {
    return point.latitude >= bbox.south &&
        point.latitude <= bbox.north &&
        point.longitude >= bbox.west &&
        point.longitude <= bbox.east;
}

/**
 * Create a bounding box from a center point and radius (in kilometers)
 */
function createBoundingBox(center: Coordinates, radiusKm: number): BoundingBox {
    const latDelta = radiusKm / 111.32; // Approximate degrees per km for latitude
    const lonDelta = radiusKm / (111.32 * Math.cos(center.latitude * Math.PI / 180));

    return {
        south: center.latitude - latDelta,
        north: center.latitude + latDelta,
        west: center.longitude - lonDelta,
        east: center.longitude + lonDelta
    };
}

/**
 * Format coordinates for display
 */
function formatCoordinates(coords: Coordinates, precision: number = 6): string {
    return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
}

/**
 * Validate coordinates
 */
function validateCoordinates(coords: Coordinates): boolean {
    return coords.latitude >= -90 && coords.latitude <= 90 &&
        coords.longitude >= -180 && coords.longitude <= 180;
}

// Export for use in different module systems
declare const module: any;
declare const window: any;

if (typeof module !== 'undefined' && module.exports) {
    // Node.js/CommonJS
    module.exports = {
        GeographicService,
        calculateDistance,
        isPointInBoundingBox,
        createBoundingBox,
        formatCoordinates,
        validateCoordinates
    };
} else if (typeof window !== 'undefined') {
    // Browser global
    window.GeographicService = GeographicService;
    window.GeographicUtils = {
        calculateDistance,
        isPointInBoundingBox,
        createBoundingBox,
        formatCoordinates,
        validateCoordinates
    };
}

// ES6 export (for TypeScript/modern JavaScript)
export {
    GeographicService,
    calculateDistance,
    isPointInBoundingBox,
    createBoundingBox,
    formatCoordinates,
    validateCoordinates
};

export type {
    Coordinates,
    BoundingBox,
    Organization,
    ApiResponse
};
