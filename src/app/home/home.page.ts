import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild('videoElement', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(private router: Router) {}

  showVideo: boolean = false;
  stream: MediaStream | null = null;

  model: any;
  isLoading: boolean = false;

  isDetecting: boolean = false;
  intervalId: any;

  errorMessage: string | null = null;

  switchToImage() {
    this.router.navigate(['/image']);
  }

  async ngOnInit() {
    try {
      await this.loadMoveNetModel();
    } catch (error) {
      console.error('Error loading MoveNet model:', error);
      this.errorMessage = 'Failed to load pose detection model. Please refresh the page.';
    }
  }

  async startCamera() {
    this.isLoading = true;
    await this.initCam();
    this.isLoading = false;
    this.showVideo = true;
  }

  async initCam() {
    try {
      //this.videoRef.nativeElement.style.transform = 'scaleX(-1)';

      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          this.stream = stream;
          this.videoRef.nativeElement.srcObject = stream;
          this.videoRef.nativeElement.play();
        })
        .catch((err) => {
          console.error('Error accessing webcam:', err);
          this.errorMessage = 'Webcam access error. Check connection and permissions.';
        });
    } catch (error) {
      console.error('Error in initCam:', error);
      this.errorMessage = 'Something went wrong while initializing the webcam.';
    }
  }

  async loadMoveNetModel() {
    await tf.ready(); // Waits until TensorFlow.js is ready
    this.model = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
    console.log('MoveNet model loaded.');
  }

  toggleDetection() {
    if (this.isDetecting) {
      this.intervalId = setInterval(() => {
        this.detectPose();
      }, 100);
    } else {
      clearInterval(this.intervalId);
    }
  }

  async detectPose() {
    if (!this.model) {
      console.error('Model is not initialized');
      return; // Exit if the model is not loaded
    }

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');

    // Resize canvas to the video dimensions
    canvas.width = this.videoRef.nativeElement.videoWidth || 640; // Default width if not available
    canvas.height = this.videoRef.nativeElement.videoHeight || 480; // Default height if not available

    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    ctx!.drawImage(this.videoRef.nativeElement, 0, 0, canvas.width, canvas.height);

    // Estimate poses
    const poses = await this.model.estimatePoses(this.videoRef.nativeElement, { flipHorizontal: true });
    poses.forEach((pose: any) => {
      console.log(pose);
      this.drawSkeleton(pose, ctx);
    });
  }

  drawSkeleton(pose: any, ctx: any) {
    // Define connections between keypoints
    const connections = [
      [0, 1], [1, 2], [2, 3], // Right arm
      [0, 4], [4, 5], [5, 6], // Left arm
      [7, 8], [8, 9],         // Right leg
      [7, 10], [10, 11],      // Left leg
      [0, 7],                 // Torso
      [0, 12],                // Head
      [12, 13], [13, 14],     // Neck to right ear
      [12, 15], [15, 16],     // Neck to left ear
    ];

    // Draw keypoints
    pose.keypoints.forEach((keypoint: any) => {
      if (keypoint.score > 0.5 && keypoint.position) {
        ctx.fillStyle = 'red';
        ctx.fillRect(keypoint.position.x - 3, keypoint.position.y - 3, 6, 6); // Center the keypoint
      }
    });

    // Draw connections
    ctx.strokeStyle = 'green'; // Color of the skeleton lines
    ctx.lineWidth = 2; // Width of the skeleton lines
    connections.forEach(([startIdx, endIdx]) => {
      const startPoint = pose.keypoints[startIdx];
      const endPoint = pose.keypoints[endIdx];

      if (startPoint && endPoint && startPoint.score > 0.5 && endPoint.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      this.videoRef.nativeElement.srcObject = null;
    }
    this.showVideo = false;
    this.isDetecting = false;
    clearInterval(this.intervalId);
  }
}
