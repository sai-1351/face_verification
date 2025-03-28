import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
import { isPlatformBrowser } from '@angular/common';
import {CommonModule} from '@angular/common'

@Component({
  selector: 'app-face-detection',
  imports:[CommonModule],
  templateUrl: './face-detection.component.html',
  styleUrls: ['./face-detection.component.css'], 
  standalone:true
}) 

export class FaceDetectionComponent implements AfterViewInit
{

  isBrowser = false;
  cameraStarted = false;
  selfieCaptured: boolean = false;

  image1Uploaded = false;
  image2Uploaded:File| null=null;

  isFaceDetected = false;
  blinkDetected  = false;
  isLightingLow  = false;
  lastBlinkTime  = Date.now();

  
  fileName1: string | null = null;
  fileName2: string | null = null;
  mediaStream: MediaStream | null = null;
 
  videoElement: HTMLVideoElement | null = null;
  imagePreviewSrc: string | null = null;
  previewImage2:string | ArrayBuffer | null =null;
  selfieBlob: Blob | null = null;  // selfie img

  camera: Camera | null = null;
  faceMesh: FaceMesh | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      console.log('Running in browser:');
      this.videoElement = document.getElementById('camera') as HTMLVideoElement | null;
    } else {
      console.log('Running on server: ');
    }
  }

  // Start Camera when button is clicked
  startCamera() {
    if (!this.isBrowser || this.cameraStarted) return;
  
    const videoElement = document.getElementById('camera') as HTMLVideoElement | null;
    const canvasElement = document.getElementById('canvas') as HTMLCanvasElement | null;
  
    if (!videoElement || !canvasElement) {
      console.error('Camera or canvas element not found!');
      return;
    }
  

    // canvasElement.style.display = "block";  
  
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        this.mediaStream = stream;
        videoElement.srcObject = stream;
        videoElement.style.display = "block";  
        videoElement.play(); // Ensure video starts playing
        this.cameraStarted = true;
        this.startFaceDetection(videoElement); // Start face detection if applicable
      })
      .catch((err) => {
        console.error('Error accessing camera:', err);
        alert("⚠️ Please allow camera access and check permissions.");
      });
  }
  
  

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.cameraStarted = false;
  }
  
  
  // restart Camera
  restartCamera() {
    this.stopCamera();
    setTimeout(() => {
      this.startCamera();
    }, 500);
  }
  

   // Capture Selfie
   captureSelfie() { 

    if (!this.isBrowser || !this.cameraStarted) return;

    if (!this.videoElement) {
      console.error("Camera not found!");
      return;
    }

    if(!this.isFaceDetected){
      alert("⚠️No Face detected. Align Your face properly")
      return;
    } 

    if(this.isLightingLow){
      alert("⚠️Low light dectected . Please improve lighting")
      return;
    }

    if(!this.blinkDetected){
      alert("⚠️Please Blink your eyes for verification")
      return;
    }  

    
    const videoElement: HTMLVideoElement = <HTMLVideoElement>document.getElementById('camera');
    const canvas: HTMLCanvasElement     = <HTMLCanvasElement>document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Create a Blob from the captured image to send in the request later
    canvas.toBlob((blob) => {
      if (blob) {
        this.selfieBlob = blob;
        this.selfieCaptured = true;
        this.fileName1 = "Captured Selfie ✅";
        
        this.image1Uploaded = true;
        // document.getElementById('selfieStatus')!.textContent = 'Selfie Captured!';


        //convert Blob to a Url ofr preview 
        const reader = new FileReader();
        reader.onloadend = () =>{
          this.imagePreviewSrc = reader.result as string;
        }; 
        reader.readAsDataURL(blob);  

      
       // ✅ Hide video and canvas after capturing
       videoElement.style.display = "none";
       canvas.style.display       = "none"; 

      // this.stopCamera();  // ✅ Stop camera completely 
 
       console.log("Selfie captured and camera hidden.");
       
      }  
    }, 'image/jpeg');
  } 


  retakeSelfie() { 

    const videoElement: HTMLVideoElement = <HTMLVideoElement>document.getElementById('camera');
    const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas');

    this.imagePreviewSrc = null; // Clear the captured image
    this.selfieCaptured = false; // Show the camera again

    videoElement.style.display = "block";
    canvas.style.display       = "block"; 

  }


   // Check lighting conditions
   checkLighting() {
    const canvasElement: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas');
    const ctx = canvasElement.getContext('2d');
    ctx?.drawImage(document.getElementById('camera') as HTMLVideoElement, 0, 0, canvasElement.width, canvasElement.height);

    const imageData = ctx?.getImageData(0, 0, canvasElement.width, canvasElement.height);
    const pixels = imageData?.data;
    let totalBrightness = 0;

    if (pixels) {
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
      }

      const avgBrightness = totalBrightness / (canvasElement.width * canvasElement.height);
      if (avgBrightness < 50) {
        this.isLightingLow = true;
        document.getElementById('selfieStatus')!.textContent = '⚠️ Low light detected. Please improve lighting.';
      } else {
        this.isLightingLow = false;
      }
    }
  } 


    // Start Face Detection
    async  startFaceDetection(videoElement: HTMLVideoElement) {

      if (!this.isBrowser) return; // Ensure this runs only in browser
    
      const { FaceMesh } = await import('@mediapipe/face_mesh');
        const canvasElement: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas');
        const canvasCtx = canvasElement.getContext("2d");
    
        const faceMesh = new FaceMesh({
          locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
    
        faceMesh.setOptions({
          maxNumFaces: 2,
          refineLandmarks: true,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });
    
        faceMesh.onResults((results: { multiFaceLandmarks: string | any[]; }) => {
          canvasCtx?.clearRect(0, 0, canvasElement.width, canvasElement.height);
          if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            this.isFaceDetected = false;  
            // console.warn("⚠️ No face detected.");
            this.blinkDetected = false;
            document.getElementById('selfieStatus')!.textContent = '⚠️ No face detected. Align your face properly.';
            return;
          }
    
          if (results.multiFaceLandmarks.length > 1) {
            this.isFaceDetected = false;
            document.getElementById('selfieStatus')!.textContent = '⚠️ Multiple faces detected! Only one face allowed.';
            return;
          }
    
          this.isFaceDetected = true;
          const faceLandmarks = results.multiFaceLandmarks[0];
          const leftEye = [faceLandmarks[159], faceLandmarks[145]];
          const rightEye = [faceLandmarks[386], faceLandmarks[374]];
    
          let leftEAR = Math.abs(leftEye[0].y - leftEye[1].y);
          let rightEAR = Math.abs(rightEye[0].y - rightEye[1].y);
          let avgEAR = (leftEAR + rightEAR) / 2;
    
          if (avgEAR < 0.02) {
            this.blinkDetected = true;
            this.lastBlinkTime = Date.now();
          }
    
          let timeSinceLastBlink = Date.now() - this.lastBlinkTime;
          if (timeSinceLastBlink > 2100) {
            this.blinkDetected = false;
            document.getElementById('selfieStatus')!.textContent = '⚠️ Please blink your eyes for verification.';
          } else {
            document.getElementById('selfieStatus')!.textContent = '✅ Face detected & ready to capture.';
          }
    
          this.checkLighting();
        });
    
        const camera = new Camera(videoElement, {
          onFrame: async () => {
            await faceMesh.send({ image: videoElement });
          },
          width: 320,
          height: 240,
        }); 
        camera.start();
  }
  

   // Handle Image Upload for Image 1
    handleFileUpload1(event: Event) {
    const input = <HTMLInputElement>event.target;
    const file = input.files?.[0];
    if (file) {
      this.fileName1 = file.name;
      document.getElementById('fileName1')!.textContent = this.fileName1;
      const reader = new FileReader();
      reader.onload = () => {
        const imgElement = <HTMLImageElement>document.getElementById('previewImage1');
        imgElement.style.display = 'block';
        imgElement.src = reader.result as string; 

        this.imagePreviewSrc = reader.result as string;
        this.image1Uploaded = true;
      };
      reader.readAsDataURL(file);
    }
  }


   // upload Image
    uploadImage(){
    if(!this.image2Uploaded){
      alert("Please select an image before uploading");
      return;
    } 
      console.log("Image 2 uploaded:",this.image2Uploaded);
      // alert("Image Uploaded sucesfully");
  }


   // Handle Image Upload for Image 2
  handleFileUpload2(event: Event) {
    const input = event.target as HTMLInputElement;
      const file = input.files?.[0];

      if(file){
        this.fileName2 = file.name;
        document.getElementById('fileName2')!.textContent=this.fileName2;
        this.image2Uploaded = file;  // ✅ This ensures image2Uploaded is set properly

        const reader = new FileReader();
        reader.onload =() =>{
          this.previewImage2 = reader.result as string ;
          // console.log("Preview Image 2 Updated:", this.previewImage2); // Debugging log
        };
      reader.readAsDataURL(file);
    }
  } 


  triggerFileInput2() {
    const fileInput = document.getElementById('imageUpload2') as HTMLInputElement;
    fileInput.click();
  }


  // Compare Faces (Add your face comparison logic here)
  compareFaces() { 

    // this.stopCamera(); 

    if (!this.selfieBlob) {
      alert("⚠️ You must capture a selfie first.");
      return;
    }

    if (!this.image2Uploaded) {
      alert("⚠️ Please upload 2nd image for Comparison");
      return;
    }

    let formData = new FormData();
    formData.append("image1", this.selfieBlob);  // Selfie as a Blob
    formData.append("image2", this.image2Uploaded);  // Image 2 uploaded as File

    fetch("http://127.0.0.1:8000/compare_faces", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        document.getElementById('result')!.textContent = `Face Match: ${data.match}`;
      })
      .catch((error) => {
        console.error("Error comparing faces:", error);
        document.getElementById('result')!.textContent = "⚠️ Failed to compare faces.";
      });
  }
 
}
