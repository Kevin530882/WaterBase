from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import json
from datetime import datetime
from pillow_heif import register_heif_opener

# Register HEIF/AVIF support
register_heif_opener()

def convert_to_degrees(value):
    """
    Convert degrees-minutes-seconds (DMS) to decimal degrees (DD).
    Handles both rational numbers (tuples) and floats.
    """
    try:
        if isinstance(value[0], tuple):
            # Handle rational numbers (e.g., ((10,1), (17,1), (4298,100)))
            d = float(value[0][0]) / float(value[0][1])
            m = float(value[1][0]) / float(value[1][1])
            s = float(value[2][0]) / float(value[2][1])
        else:
            # Handle floats (e.g., [10.0, 17.0, 42.98])
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)
    except (TypeError, IndexError, ZeroDivisionError):
        return None

def check_image_tampering(image_path):
    """
    Check for tampering in the image's GPS metadata and return results.
    """
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()  # Use _getexif() for compatibility
        if exif_data is None:
            return {"tampered": True, "reasons": ["No EXIF data found"], "gps": None}
    except Exception as e:
        return {"error": str(e), "tampered": True, "reasons": ["Failed to open image or access metadata"], "gps": None}

    # Debug: Print EXIF data
    print("EXIF data:", dict(exif_data))

    # Extract GPSInfo
    gps_info = {}
    for key, val in exif_data.items():
        if key in TAGS and TAGS[key] == 'GPSInfo':
            try:
                for t in val:
                    sub_tag_name = GPSTAGS.get(t, t)
                    gps_info[sub_tag_name] = val[t]
            except (TypeError, AttributeError) as e:
                print("GPSInfo (raw):", val)
                return {"tampered": True, "reasons": [f"Invalid GPSInfo format: {str(e)}"], "gps": None}

    # Debug: Print GPSInfo
    print("GPSInfo:", gps_info)

    reasons = []
    gps = None

    # Check for GPSInfo
    if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
        lat_ref = gps_info.get('GPSLatitudeRef', '')
        lat = gps_info.get('GPSLatitude')
        latitude = convert_to_degrees(lat)
        if latitude is None:
            reasons.append("Invalid GPS latitude format")
        elif lat_ref != 'N':
            latitude = -latitude
        # Check range
        if latitude is not None and not (-90 <= latitude <= 90):
            reasons.append("Invalid latitude")

        lng_ref = gps_info.get('GPSLongitudeRef', '')
        lng = gps_info.get('GPSLongitude')
        longitude = convert_to_degrees(lng)
        if longitude is None:
            reasons.append("Invalid GPS longitude format")
        elif lng_ref != 'E':
            longitude = -longitude
        # Check range
        if longitude is not None and not (-180 <= longitude <= 180):
            reasons.append("Invalid longitude")

        # If both latitude and longitude are extracted without errors, set gps
        if latitude is not None and longitude is not None and not any(r.startswith("Invalid") for r in reasons):
            gps = {"latitude": latitude, "longitude": longitude}
        else:
            gps = None
    else:
        reasons.append("Incomplete GPS data")

    # Check for DateTimeOriginal
    if 36867 not in exif_data:  # 36867 is DateTimeOriginal
        reasons.append("No DateTimeOriginal found")
    else:
        dt_original = exif_data[36867]
        try:
            dt_original_obj = datetime.strptime(dt_original, "%Y:%m:%d %H:%M:%S")
        except (ValueError, TypeError):
            reasons.append("Invalid DateTimeOriginal")

    # Compare GPS timestamp with DateTimeOriginal
    if gps is not None and 36867 in exif_data and 'GPSDateStamp' in gps_info and 'GPSTimeStamp' in gps_info:
        gps_date_str = gps_info['GPSDateStamp']
        gps_time = gps_info['GPSTimeStamp']
        try:
            # Handle GPSTimeStamp as either rationals or floats
            if isinstance(gps_time[0], tuple):
                h = float(gps_time[0][0]) / float(gps_time[0][1])
                m = float(gps_time[1][0]) / float(gps_time[1][1])
                s = float(gps_time[2][0]) / float(gps_time[2][1])
            else:
                h = float(gps_time[0])
                m = float(gps_time[1])
                s = float(gps_time[2])
            gps_datetime = datetime.strptime(gps_date_str + f" {int(h):02d}:{int(m):02d}:{int(s):02d}", "%Y:%m:%d %H:%M:%S")
            dt_original_obj = datetime.strptime(exif_data[36867], "%Y:%m:%d %H:%M:%S")
            if abs((gps_datetime - dt_original_obj).total_seconds()) > 3600:  # More than 1 hour
                reasons.append("GPS timestamp and DateTimeOriginal differ by more than 1 hour")
        except (ValueError, TypeError, ZeroDivisionError):
            reasons.append("Invalid GPS timestamp")

    tampered = len(reasons) > 0
    return {"tampered": tampered, "reasons": reasons, "gps": gps}

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python check_location.py <image_path>"}))
        sys.exit(1)
    image_path = sys.argv[1]
    result = check_image_tampering(image_path)
    print(json.dumps(result))
























# from PIL import Image
# from PIL.ExifTags import TAGS, GPSTAGS
# import json

# def get_gps_info(image_path):
#     image = Image.open(image_path)
#     exif_data = image._getexif()
#     if exif_data is None:
#         return None
#     gps_info = {}
#     for key, val in exif_data.items():
#         if key in TAGS:
#             tag_name = TAGS[key]
#             if tag_name == 'GPSInfo':
#                 for t in val:
#                     sub_tag_name = GPSTAGS.get(t, t)
#                     gps_info[sub_tag_name] = val[t]
#     if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
#         lat = gps_info['GPSLatitude']
#         lat_ref = gps_info['GPSLatitudeRef']
#         lng = gps_info['GPSLongitude']
#         lng_ref = gps_info['GPSLongitudeRef']
#         def convert_to_degrees(value):
#             d = float(value[0])
#             m = float(value[1])
#             s = float(value[2])
#             return d + (m / 60.0) + (s / 3600.0)
#         latitude = convert_to_degrees(lat)
#         if lat_ref != 'N':
#             latitude = -latitude
#         longitude = convert_to_degrees(lng)
#         if lng_ref != 'E':
#             longitude = -longitude
#         return latitude, longitude
#     else:
#         return None



# if __name__ == "__main__":
#     import sys
#     if len(sys.argv) != 2:
#         print(json.dumps({"error": "Usage: python check_location.py <image_path>"}))
#         sys.exit(1)
#     image_path = sys.argv[1]
#     gps = get_gps_info(image_path)

#     if gps:
#         output = {
#             'Latitude': gps[0],
#             'Longitude': gps[1]
#         }
#         print(json.dumps(output))
#     else:
#         print(json.dumps({"error": "No GPS data found in the image."}))

        
# else:
#     image_path = 'path_to_your_image.jpg'
#     gps = get_gps_info(image_path)
#     if gps:
#         print(f'Latitude: {gps[0]}, Longitude: {gps[1]}')
#     else:
#         print('No GPS data found in the image.')
