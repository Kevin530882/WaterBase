# import json
# from ultralytics import YOLO
# import torch

# def main(image_path):
#     try:
#         # Load the YOLO model
#         model = YOLO("../vision_models/water_detector.pt")  # Adjust this path
        
#         # Run inference with verbose=False to suppress timing output
#         results = model(image_path, verbose=False)
        
#         # Initialize predictions list
#         predictions = []
        
#         # Check if there are detections and masks
#         if results[0].boxes is not None and results[0].masks is not None:
#             # Loop through boxes and corresponding masks
#             for i, box in enumerate(results[0].boxes):
#                 # Get the mask data for this detection
#                 mask = results[0].masks[i].data  # Binary mask tensor
#                 # Calculate the mask area (sum of pixels where value is 1)
#                 mask_area = torch.sum(mask).item()
                
#                 predictions.append({
#                     "label": box.cls.item(),      # Class ID as integer
#                     "class_name": model.names[int(box.cls.item())],  # Class name
#                     "confidence": box.conf.item(), # Confidence score as float
#                     "mask_area": mask_area        # Mask area as float
#                 })
#         # If no detections, predictions remains an empty list
        
#         # Output predictions as JSON
#         print(json.dumps(predictions))
    
#     except Exception as e:
#         # Output error as JSON to help debugging
#         print(json.dumps({"error": str(e)}))

# if __name__ == "__main__":
#     import sys
#     if len(sys.argv) != 2:
#         print(json.dumps({"error": "Usage: python predict_pollution.py <image_path>"}))
#         sys.exit(1)
#     image_path = sys.argv[1]
#     main(image_path)

import json
import torch
import cv2
import numpy as np
import os
from ultralytics import YOLO

def preprocess_image(image_path, target_size=640):
    """Preprocess the image by resizing to target_size while maintaining aspect ratio."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to load image: {image_path}")
    
    # Resize while maintaining aspect ratio
    h, w = img.shape[:2]
    scale = target_size / max(h, w)
    new_h, new_w = int(h * scale), int(w * scale)
    img_resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    # Save the resized image with the same extension
    base, ext = os.path.splitext(image_path)
    temp_path = f"{base}_resized{ext}"
    cv2.imwrite(temp_path, img_resized)
    return temp_path, (new_h, new_w), img_resized

def visualize_masks(image, results_list, model_names, class_colors, class_labels, image_shape):
    """Overlay masks on the image with area annotations, ensuring mask dimensions match image."""
    overlay = image.copy()
    
    for results, model_name, names in results_list:
        if results[0].boxes is None or results[0].masks is None:
            print(f"No detections for {model_name}")
            continue
        for i, (box, mask) in enumerate(zip(results[0].boxes, results[0].masks)):
            class_index = int(box.cls.item())
            class_name = names[class_index]
            if class_name not in class_labels[model_name]:
                print(f"Skipping {class_name} for {model_name}")
                continue
            
            # Get mask data and resize to match image dimensions
            mask_data = mask.data.cpu().numpy().squeeze()
            mask_data = cv2.resize(mask_data, (image_shape[1], image_shape[0]), interpolation=cv2.INTER_NEAREST)
            mask_data = (mask_data > 0).astype(np.uint8)  # Ensure binary mask
            mask_area = np.sum(mask_data).item()
            
            print(f"Processing {class_name} for {model_name}: area={mask_area}")
            
            # Create colored mask
            color = class_colors[class_name]
            colored_mask = np.zeros_like(image)
            colored_mask[mask_data > 0] = color
            
            # Overlay mask with transparency (increase alpha for water)
            alpha = 0.6 if class_name == "Water" else 0.4
            overlay = cv2.addWeighted(overlay, 1.0, colored_mask, alpha, 0.0)
            
            # Try centroid for text annotation, fallback to bounding box top-left
            moments = cv2.moments(mask_data)
            if moments['m00'] > 0:
                cx = int(moments['m10'] / moments['m00'])
                cy = int(moments['m01'] / moments['m00'])
                print(f"{class_name} centroid: ({cx}, {cy})")
            else:
                # Fallback to bounding box top-left
                contours, _ = cv2.findContours(mask_data, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    x, y, _, _ = cv2.boundingRect(contours[0])
                    cx, cy = x + 10, y + 10
                    print(f"{class_name} fallback to bounding box: ({cx}, {cy})")
                else:
                    print(f"No valid centroid or bounding box for {class_name}")
                    continue
            
            # Ensure text is within image bounds
            cx = max(0, min(cx, image_shape[1] - 100))
            cy = max(0, min(cy, image_shape[0] - 20))
            
            # Draw area text with black outline for readability
            text = f"{class_name}: {int(mask_area)} px"
            cv2.putText(overlay, text, (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2, cv2.LINE_AA)
            cv2.putText(overlay, text, (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    
    return overlay

def main(image_path):
    try:
        # Preprocess the image
        resized_image_path, (new_h, new_w), resized_image = preprocess_image(image_path, target_size=640)
        
        # Define class colors (BGR format for OpenCV)
        class_colors = {
            "Water": (255, 0, 0),           # Blue
            "trash": (0, 0, 255),           # Red
            "unnatural_color": (0, 255, 255), # Yellow
            "green_algal_blooms": (0, 255, 0) # Green
        }
        
        # Define valid class labels for each model
        class_labels = {
            "water_model": ["Water"],
            "trash_model": ["trash"],
            "pollution_model": ["unnatural_color", "green_algal_blooms"]
        }
        
        # Load the water model
        water_model = YOLO("../vision_models/water_detector.pt")  # Adjust this path
        
        # Run inference for water model
        water_results = water_model(resized_image_path, verbose=False, conf=0.5, iou=0.7)
        
        # Initialize areas and predictions
        total_water_area = 0.0
        water_predictions = []
        
        # Process water model results
        if water_results[0].boxes is not None and water_results[0].masks is not None:
            for i, box in enumerate(water_results[0].boxes):
                mask = water_results[0].masks[i].data
                mask_area = torch.sum(mask).item()
                total_water_area += mask_area
                water_predictions.append({
                    "label": box.cls.item(),
                    "class_name": water_model.names[int(box.cls.item())],
                    "confidence": box.conf.item(),
                    "mask_area": mask_area
                })
        
        # If no water is detected, visualize only water results and return early

        # if total_water_area == 0.0:
        #     # Visualize water results (if any)
        #     results_list = [(water_results, "water_model", water_model.names)]
        #     annotated_image = visualize_masks(resized_image, results_list, ["water_model"], class_colors, class_labels, (new_h, new_w))
        #     # Save annotated image
        #     base, ext = os.path.splitext(image_path)
        #     annotated_path = f"{base}_annotated{ext}"
        #     cv2.imwrite(annotated_path, annotated_image)
            
        #     output = {
        #         "water_predictions": water_predictions,
        #         "trash_predictions": [],
        #         "pollution_predictions": [],
        #         "polluted_area": 0.0,
        #         "total_water_area": 0.0,
        #         "pollution_percentage": 0.0,
        #         "annotated_image_path": annotated_path
        #     }
        #     print(json.dumps(output))
        #     os.remove(resized_image_path)  # Clean up temporary file
        #     return
        
        # Load and run other models
        trash_model = YOLO("../vision_models/trash_detector.pt")
        pollution_model = YOLO("../vision_models/unnatural_color_detector.pt")
        
        trash_results = trash_model(resized_image_path, verbose=False, conf=0.5, iou=0.7)
        pollution_results = pollution_model(resized_image_path, verbose=False, conf=0.5, iou=0.7)
        
        # Initialize remaining areas and predictions
        polluted_area = 0.0
        trash_predictions = []
        pollution_predictions = []
        
        # Process trash model results
        if trash_results[0].boxes is not None and trash_results[0].masks is not None:
            for i, box in enumerate(trash_results[0].boxes):
                mask = trash_results[0].masks[i].data
                mask_area = torch.sum(mask).item()
                polluted_area += mask_area
                trash_predictions.append({
                    "label": box.cls.item(),
                    "class_name": trash_model.names[int(box.cls.item())],
                    "confidence": box.conf.item(),
                    "mask_area": mask_area
                })
        
        # Process pollution model results
        if pollution_results[0].boxes is not None and pollution_results[0].masks is not None:
            for i, box in enumerate(pollution_results[0].boxes):
                class_index = int(box.cls.item())
                class_name = pollution_model.names[class_index]
                if class_name in class_labels["pollution_model"]:
                    mask = pollution_results[0].masks[i].data
                    mask_area = torch.sum(mask).item()
                    polluted_area += mask_area
                    pollution_predictions.append({
                        "label": class_index,
                        "class_name": class_name,
                        "confidence": box.conf.item(),
                        "mask_area": mask_area
                    })
        
        # Calculate pollution percentage
        pollution_percentage = 0.0
        if total_water_area > 0:
            pollution_percentage = (polluted_area / total_water_area) * 100
        
        # Visualize all results
        results_list = [
            (water_results, "water_model", water_model.names),
            (trash_results, "trash_model", trash_model.names),
            (pollution_results, "pollution_model", pollution_model.names)
        ]
        annotated_image = visualize_masks(resized_image, results_list, ["water_model", "trash_model", "pollution_model"], class_colors, class_labels, (new_h, new_w))
        
        # Save annotated image
        base, ext = os.path.splitext(image_path)
        annotated_path = f"{base}_annotated{ext}"
        cv2.imwrite(annotated_path, annotated_image)
        
        # Prepare output
        output = {
            "water_predictions": water_predictions,
            "trash_predictions": trash_predictions,
            "pollution_predictions": pollution_predictions,
            "polluted_area": polluted_area,
            "total_water_area": total_water_area,
            "pollution_percentage": round(pollution_percentage, 2),
            "annotated_image_path": annotated_path
        }
        
        # Output as JSON
        print(json.dumps(output))
        os.remove(resized_image_path)  # Clean up temporary file
    
    except Exception as e:
        # Output error as JSON
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python predict_pollution.py <image_path>"}))
        sys.exit(1)
    image_path = sys.argv[1]
    main(image_path)