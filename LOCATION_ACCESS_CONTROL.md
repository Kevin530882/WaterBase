# WaterBase Location-Based Access Control Implementation

## Overview

This implementation provides a comprehensive solution for location-based access control and report grouping for the WaterBase pollution reporting system. Organizations can only see reports within their designated area of responsibility, and reports are automatically grouped for efficient cleanup event management.

## Key Features

### 1. Location-Based Access Control

#### Database Schema Changes
- **Reports Table**: Added location hierarchy fields (`region_code`, `region_name`, `province_name`, `municipality_name`, `barangay_name`)
- **Report Groups Table**: New table for managing spatially and temporally grouped reports
- **Events Table**: Linked to report groups for cleanup event management

#### Access Control Rules
Organizations can see reports based on their area of responsibility hierarchy:

- **Barangay-level organizations**: See reports in their specific barangay
- **Municipality-level organizations**: See reports in all barangays within their municipality
- **Province-level organizations**: See reports in all municipalities and barangays within their province  
- **Region-level organizations**: See reports in all provinces, municipalities, and barangays within their region

#### Area of Responsibility Format
```
Region Level: "REGION I"
Province Level: "ILOCOS NORTE" 
Municipality Level: "BACARRA, ILOCOS NORTE"
Barangay Level: "BANI, BACARRA, ILOCOS NORTE"
```

### 2. Report Grouping System

#### Automatic Grouping Rules
- Reports within 50m radius (configurable) are automatically grouped
- Only considers reports from the last 7 days (configurable)
- Groups become inactive once a cleanup event is created
- New reports in previously cleaned areas start new groups

#### Configuration
Environment variables in `.env`:
```env
REPORT_GROUPING_RADIUS=50.0  # meters
REPORT_GROUPING_DAYS=7       # days
```

## Database Migrations

### New Tables and Fields

1. **Report Groups** (`report_groups`)
   - `id` - Primary key
   - `center_latitude`, `center_longitude` - Group center coordinates
   - `radius_meters` - Group radius (default 50m)
   - `first_report_at`, `last_report_at` - Temporal boundaries
   - `cleanup_event_id` - Linked cleanup event (nullable)
   - `is_active` - Whether group accepts new reports
   - `report_count` - Number of reports in group

2. **Reports** (added fields)
   - `region_code`, `region_name` - Philippine region
   - `province_name` - Province name
   - `municipality_name` - City/municipality name  
   - `barangay_name` - Barangay name
   - `report_group_id` - Foreign key to report group
   - `geocoded_at` - Timestamp of geocoding

3. **Events** (added field)
   - `report_group_id` - Foreign key to report group for cleanup events

## Core Services

### 1. LocationService
- Loads Philippine administrative boundaries from JSON
- Geocodes coordinates to location hierarchy
- Validates area of responsibility formats
- Provides location hierarchy navigation

### 2. ReportAccessControlService  
- Filters reports based on user's area of responsibility
- Validates organization access to specific reports
- Batch geocodes unprocessed reports
- Provides location-based statistics

### 3. ReportGroupingService
- Automatically groups spatially/temporally close reports
- Manages group lifecycle and cleanup event integration
- Handles distance calculations and group assignment
- Provides grouping statistics and management tools

## API Endpoints

### Location-Based Access
```
GET /api/reports/accessible - Get reports user can see
GET /api/report-groups/accessible - Get report groups user can see  
GET /api/location/statistics - Get location/grouping statistics
POST /api/location/validate-aor - Validate area of responsibility format
POST /api/location/geocode - Convert coordinates to location
POST /api/location/nearby-groups - Find nearby report groups
```

### Management
```
GET /api/location/locations?level=region&parent[]=... - Get locations at level
GET /api/report-groups/needs-cleanup - Get groups needing cleanup events
```

## Console Commands

### Geocoding Reports
```bash
php artisan reports:geocode --limit=100
```

Batch processes reports to add location information.

## Event System

### ReportObserver
Automatically handles:
- Geocoding new reports when created
- Re-geocoding when coordinates change  
- Updating group statistics when reports are deleted/restored
- Managing group lifecycle

## Usage Examples

### Creating a User with Area of Responsibility
```php
$user = User::create([
    'firstName' => 'Juan',
    'lastName' => 'Dela Cruz', 
    'email' => 'juan@barangay.gov.ph',
    'role' => 'LGU',
    'organization' => 'Barangay Bani',
    'areaOfResponsibility' => 'BANI, BACARRA, ILOCOS NORTE'
]);
```

### Getting Accessible Reports
```php
$accessControl = app(ReportAccessControlService::class);
$reports = $accessControl->getAccessibleReports($user)->get();
```

### Creating Cleanup Event for Report Group
```php
$groupingService = app(ReportGroupingService::class);
$event = $groupingService->createCleanupEvent($reportGroup, [
    'title' => 'Beach Cleanup',
    'date' => '2025-08-15',
    'time' => '08:00:00',
    'duration' => 4.0,
    'maxVolunteers' => 50,
    'user_id' => $organizerUserId
]);
```

## Security Considerations

1. **Access Control**: Users can only see reports within their designated area
2. **Geocoding Validation**: Reports must be successfully geocoded to be visible
3. **Area Validation**: Area of responsibility format is validated before assignment
4. **Caching**: Location lookups are cached for performance
5. **Error Handling**: Graceful fallbacks for geocoding failures

## Performance Optimizations

1. **Database Indexes**: Added indexes on location fields and coordinates
2. **Caching**: Location hierarchy and area parsing results are cached
3. **Batch Processing**: Console command for batch geocoding
4. **Spatial Queries**: Optimized distance calculations for grouping

## Configuration Options

### Environment Variables
```env
# Report grouping settings
REPORT_GROUPING_RADIUS=50.0  # meters - radius for grouping reports
REPORT_GROUPING_DAYS=7       # days - time window for grouping

# Cache settings  
CACHE_DRIVER=redis  # Recommended for production
```

### Configurable Parameters
- Grouping radius (default: 50 meters)
- Grouping time window (default: 7 days)
- Minimum reports for cleanup suggestion (default: 3)
- Minimum age for cleanup suggestion (default: 7 days)

## Future Enhancements

1. **Improved Geocoding**: Integration with Google Maps or Nominatim API
2. **Spatial Database**: Migration to PostGIS for accurate polygon-based location matching  
3. **Real-time Updates**: WebSocket integration for live report grouping updates
4. **Mobile Integration**: Offline-capable location detection
5. **Analytics Dashboard**: Visual representation of location-based access patterns

## Troubleshooting

### Common Issues

1. **Geocoding Failures**: Check if coordinates are within Philippine bounds
2. **Access Denied**: Verify user's area of responsibility format
3. **Missing Reports**: Ensure reports are geocoded and within user's area
4. **Group Assignment**: Check radius and time window settings

### Debug Commands
```bash
# Check migration status
php artisan migrate:status

# Batch geocode reports
php artisan reports:geocode --limit=10

# Clear location cache
php artisan cache:forget philippine_areas_data
```

This implementation provides a robust foundation for location-based access control while maintaining the flexibility to handle the complex administrative hierarchy of the Philippines.
