# app/utils.py

import os
import tempfile
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

# Initialize RetinaFace + ArcFace (on CPU)
face_analyzer = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
face_analyzer.prepare(ctx_id=0)

def save_uploaded_file(uploaded_file):
    """Save an uploaded file to a temporary location and return the file path."""
    try:
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        temp_file.write(uploaded_file.file.read())
        temp_file.flush()  # Ensure data is written
        temp_file.close()
        return temp_file.name  # Return the file path
    except Exception as e:
        print(f"[ERROR] Failed to save uploaded file: {str(e)}")
        return None

def extract_face_embedding(image_path):
    """Detect and extract facial embeddings using ArcFace."""
    try:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Invalid or corrupted image file: {image_path}")

        faces = face_analyzer.get(img)
        num_faces = len(faces)

        if num_faces == 0:
            print(f"[DEBUG] No face detected in {image_path}")
            return None, "No face detected."

        if num_faces > 1:
            print(f"[DEBUG] Multiple faces detected ({num_faces}) in {image_path}")
            return None, f"Multiple faces detected ({num_faces}). Only one face is allowed."

        face = max(faces, key=lambda x: x.bbox[2] - x.bbox[0])  # Pick the largest face
        embedding = face.normed_embedding

        if embedding is None or len(embedding) == 0:
            return None, "Failed to extract face embedding."

        return embedding / np.linalg.norm(embedding), None  # Normalize the embedding
    except Exception as e:
        print(f"[ERROR] Face extraction error: {str(e)}")
        return None, str(e)
