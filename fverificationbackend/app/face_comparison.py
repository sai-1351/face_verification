# app/face_comparison.py

import os
import cv2
import time
import numpy as np
import tempfile
from fastapi import APIRouter, UploadFile, File
from sklearn.metrics.pairwise import cosine_similarity
from app.utils import save_uploaded_file, extract_face_embedding

router = APIRouter()

@router.post("/compare_faces/")
async def compare_faces(image1: UploadFile = File(...), image2: UploadFile = File(...)):
    """Compare two face images and return a similarity score."""
    start_time = time.time()
    # Save uploaded images
    temp1_path = save_uploaded_file(image1)
    temp2_path = save_uploaded_file(image2)

    if temp1_path is None or temp2_path is None:
        return {"match": "NO ❌", "similarity_score": 0.0, "message": "Failed to save uploaded images."}

    # Extract facial embeddings
    embedding1, error1 = extract_face_embedding(temp1_path)
    embedding2, error2 = extract_face_embedding(temp2_path)

    # Cleanup temporary images
    os.remove(temp1_path)
    os.remove(temp2_path)

    # If either embedding is missing, return failure
    if embedding1 is None or embedding2 is None:
        return {
            "match": "NO ❌",
            "similarity_score": 0.0,
            "message": error1 or error2
        }

    # Compute cosine similarity
    similarity = cosine_similarity([embedding1], [embedding2])[0][0]
     
    # Set a better threshold for match
    match = similarity > 0.30
    end_time = time.time() 

    processing_time = end_time - start_time

    return {
        "match": "YES ✅" if match else "NO ❌",
        "similarity_score":f"{round((similarity)*100, 2)}%",
        "Processing time":f"{round(processing_time,2)}seconds"
    }
