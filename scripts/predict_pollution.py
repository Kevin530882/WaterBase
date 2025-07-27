import json
from ultralytics import YOLO
import torch

def main(image_path):
    try:
        # Load the YOLO model
        model = YOLO("../vision_models/water_detector.pt")  # Adjust this path
        
        # Run inference with verbose=False to suppress timing output
        results = model(image_path, verbose=False)
        
        # Initialize predictions list
        predictions = []
        
        # Check if there are detections and masks
        if results[0].boxes is not None and results[0].masks is not None:
            # Loop through boxes and corresponding masks
            for i, box in enumerate(results[0].boxes):
                # Get the mask data for this detection
                mask = results[0].masks[i].data  # Binary mask tensor
                # Calculate the mask area (sum of pixels where value is 1)
                mask_area = torch.sum(mask).item()
                
                predictions.append({
                    "label": box.cls.item(),      # Class ID as integer
                    "class_name": model.names[int(box.cls.item())],  # Class name
                    "confidence": box.conf.item(), # Confidence score as float
                    "mask_area": mask_area        # Mask area as float
                })
        # If no detections, predictions remains an empty list
        
        # Output predictions as JSON
        print(json.dumps(predictions))
    
    except Exception as e:
        # Output error as JSON to help debugging
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python predict_pollution.py <image_path>"}))
        sys.exit(1)
    image_path = sys.argv[1]
    main(image_path)