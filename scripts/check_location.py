from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import json

def get_gps_info(image_path):
    image = Image.open(image_path)
    exif_data = image._getexif()
    if exif_data is None:
        return None
    gps_info = {}
    for key, val in exif_data.items():
        if key in TAGS:
            tag_name = TAGS[key]
            if tag_name == 'GPSInfo':
                for t in val:
                    sub_tag_name = GPSTAGS.get(t, t)
                    gps_info[sub_tag_name] = val[t]
    if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
        lat = gps_info['GPSLatitude']
        lat_ref = gps_info['GPSLatitudeRef']
        lng = gps_info['GPSLongitude']
        lng_ref = gps_info['GPSLongitudeRef']
        def convert_to_degrees(value):
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)
        latitude = convert_to_degrees(lat)
        if lat_ref != 'N':
            latitude = -latitude
        longitude = convert_to_degrees(lng)
        if lng_ref != 'E':
            longitude = -longitude
        return latitude, longitude
    else:
        return None



if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python check_location.py <image_path>"}))
        sys.exit(1)
    image_path = sys.argv[1]
    gps = get_gps_info(image_path)

    if gps:
        output = {
            'Latitude': gps[0],
            'Longitude': gps[1]
        }
        print(json.dumps(output))
    else:
        print(json.dumps({"error": "No GPS data found in the image."}))

        
else:
    image_path = 'path_to_your_image.jpg'
    gps = get_gps_info(image_path)
    if gps:
        print(f'Latitude: {gps[0]}, Longitude: {gps[1]}')
    else:
        print('No GPS data found in the image.')
