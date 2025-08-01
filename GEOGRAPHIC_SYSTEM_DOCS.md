# Geographic-Based Organization Filtering System

This system extends the existing `areaOfResponsibility` functionality in the users table to include precise geographic boundaries. When organizations set or update their area of responsibility, the system automatically fetches and stores geographic bounding box data. When reports are submitted, the system can then precisely determine which organizations should see each report based on geographic containment.

## Database Schema

The `users` table now includes these additional columns:
- `bbox_south` (DOUBLE): Southern boundary latitude
- `bbox_north` (DOUBLE): Northern boundary latitude  
- `bbox_west` (DOUBLE): Western boundary longitude
- `bbox_east` (DOUBLE): Eastern boundary longitude

## Backend PHP API

### GeographicService Class

The `GeographicService` class provides two main functions:

#### 1. Register Area of Responsibility
```php
use App\Services\GeographicService;

$geographicService = new GeographicService();

// Register or update an organization's area
$result = $geographicService->registerAreaOfResponsibility(
    $orgId = 123,
    $areaString = "Cebu City, Cebu, Region 7"
);

if ($result['success']) {
    echo "Area registered successfully!";
    print_r($result['bounding_box']);
} else {
    echo "Error: " . $result['error'];
}
```

#### 2. Find Organizations for Report
```php
// Find which organizations should see a report
$result = $geographicService->findOrgsForReport(
    $reportAddress = "Lahug, Cebu City, Cebu"
);

if ($result['success']) {
    echo "Found " . count($result['organizations']) . " matching organizations:";
    foreach ($result['organizations'] as $org) {
        echo "- " . $org['organization'] . " (" . $org['areaOfResponsibility'] . ")";
    }
}
```

### API Endpoints

All endpoints require authentication via Sanctum token.

#### Geographic Endpoints
- `POST /api/geographic/register-area` - Register organization's area
- `POST /api/geographic/update-my-area` - Update current user's area
- `POST /api/geographic/find-orgs` - Find organizations for an address
- `GET /api/geographic/organizations` - Get all organizations with boundaries
- `POST /api/geographic/test-point` - Test if point is in organization's area
- `POST /api/geographic/geocode` - Geocode an address

#### Report Endpoints (Enhanced)
- `POST /api/reports/organizations` - Get organizations for report address

### Example API Usage

#### Register Area (Admin)
```bash
curl -X POST http://localhost:8000/api/geographic/register-area \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": 123,
    "area": "Cebu City, Cebu, Region 7"
  }'
```

#### Update My Area (Current User)
```bash
curl -X POST http://localhost:8000/api/geographic/update-my-area \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "area": "Manila, Metro Manila, Philippines"
  }'
```

#### Find Organizations for Report
```bash
curl -X POST http://localhost:8000/api/geographic/find-orgs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "University of the Philippines Diliman, Quezon City"
  }'
```

## Frontend JavaScript/TypeScript

### Using the GeographicService Class

```javascript
// Import the service
import { GeographicService } from './services/geographic.ts';

// Or for plain JavaScript
// <script src="./services/geographic.js"></script>

// Initialize the service
const geoService = new GeographicService('/api');
geoService.setAuthToken('your-auth-token-here');

// Register an organization's area
async function registerOrgArea(orgId, areaString) {
    const result = await geoService.registerAreaOfResponsibility(orgId, areaString);
    
    if (result.success) {
        console.log('Area registered:', result.data.bounding_box);
        return result.data;
    } else {
        console.error('Error:', result.message);
        throw new Error(result.message);
    }
}

// Find organizations for a report
async function findOrgsForReport(reportAddress) {
    const result = await geoService.findOrgsForReport(reportAddress);
    
    if (result.success) {
        console.log('Geocoded coordinates:', result.data.coordinates);
        console.log('Matching organizations:', result.data.organizations);
        return result.data;
    } else {
        console.error('Error:', result.message);
        throw new Error(result.message);
    }
}

// Example usage
try {
    // Register area for organization
    await registerOrgArea(123, "Cebu City, Cebu, Region 7");
    
    // Find organizations for a report
    const reportData = await findOrgsForReport("Lahug, Cebu City, Cebu");
    
    // Display results
    reportData.organizations.forEach(org => {
        console.log(`${org.organization} should see this report`);
    });
    
} catch (error) {
    console.error('Operation failed:', error.message);
}
```

### Utility Functions

The service also includes geographic utility functions:

```javascript
import { 
    calculateDistance, 
    isPointInBoundingBox, 
    createBoundingBox,
    formatCoordinates,
    validateCoordinates 
} from './services/geographic.ts';

// Calculate distance between two points
const distance = calculateDistance(
    { latitude: 10.3157, longitude: 123.8854 }, // Cebu City
    { latitude: 14.5995, longitude: 120.9842 }  // Manila
);
console.log(`Distance: ${distance.toFixed(2)} km`);

// Check if point is in bounding box
const point = { latitude: 10.3157, longitude: 123.8854 };
const bbox = { south: 10.0, north: 11.0, west: 123.0, east: 124.0 };
const isInside = isPointInBoundingBox(point, bbox);
console.log(`Point is inside: ${isInside}`);

// Create bounding box from center and radius
const centerPoint = { latitude: 10.3157, longitude: 123.8854 };
const boundingBox = createBoundingBox(centerPoint, 50); // 50km radius
console.log('Bounding box:', boundingBox);
```

## Enhanced Report Filtering

The system automatically uses geographic filtering when available, with text-based filtering as fallback:

### In ReportController
```php
// The system automatically chooses the best filtering method
public function index(Request $request) {
    $user = $request->user();
    $query = Report::with(['user:id,firstName,lastName,email']);

    if ($user->areaOfResponsibility) {
        if ($this->hasGeographicBounds($user)) {
            // Use precise geographic filtering
            $query = $this->filterByGeographicBounds($query, $user);
        } else {
            // Fallback to text-based filtering
            $query = $this->filterByAreaOfResponsibility($query, $user->areaOfResponsibility);
        }
    }

    return $query->orderBy('created_at', 'desc')->get();
}
```

## Data Flow

1. **Organization Setup**:
   - Admin or organization sets `areaOfResponsibility` (e.g., "Cebu City, Cebu")
   - System calls Nominatim API to get geographic boundaries
   - Bounding box coordinates are stored in `bbox_*` columns

2. **Report Submission**:
   - User submits report with address
   - System geocodes the address to get coordinates
   - System finds all organizations whose bounding box contains the point
   - Report is shown only to matching organizations

3. **Report Viewing**:
   - Organizations see only reports within their geographic area
   - Admin users see all reports regardless of area
   - Fallback to text-based filtering if no geographic data available

## Error Handling

The system includes comprehensive error handling:

- **Network errors**: Graceful fallback when Nominatim API is unavailable
- **Invalid coordinates**: Validation of all latitude/longitude values
- **Missing data**: Fallback to text-based filtering when geographic data is missing
- **API limits**: Respectful API usage with proper User-Agent headers

## Configuration

### Environment Variables
Add these to your `.env` file if you want to customize the geocoding service:

```env
# Optional: Custom Nominatim instance
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org

# Optional: Contact info for API requests
NOMINATIM_USER_AGENT="WaterBase/1.0 (contact@waterbase.app)"
```

## Testing

### Test Geographic Operations
```bash
# Test point in area
curl -X POST http://localhost:8000/api/geographic/test-point \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": 123,
    "latitude": 10.3157,
    "longitude": 123.8854
  }'

# Geocode address
curl -X POST http://localhost:8000/api/geographic/geocode \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "University of San Carlos, Cebu City"
  }'
```

### Frontend Testing
```javascript
// Test the complete workflow
async function testGeographicSystem() {
    const geoService = new GeographicService('/api');
    geoService.setAuthToken(localStorage.getItem('auth_token'));
    
    try {
        // 1. Update current user's area
        console.log('Updating area...');
        const updateResult = await geoService.updateMyArea('Cebu City, Cebu, Region 7');
        console.log('Update result:', updateResult);
        
        // 2. Test geocoding
        console.log('Geocoding address...');
        const geocodeResult = await geoService.geocodeAddress('Lahug, Cebu City');
        console.log('Geocoding result:', geocodeResult);
        
        // 3. Find organizations for report
        console.log('Finding organizations...');
        const orgsResult = await geoService.findOrgsForReport('IT Park, Cebu City');
        console.log('Organizations result:', orgsResult);
        
        console.log('All tests completed successfully!');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testGeographicSystem();
```

This geographic system provides precise, reliable filtering while maintaining backward compatibility with the existing text-based approach.
