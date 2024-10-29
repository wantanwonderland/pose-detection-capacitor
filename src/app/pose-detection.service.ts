import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/pose-detection';

@Injectable({
  providedIn: 'root',
})
export class PoseDetectionService {
  private detector: posenet.PoseDetector | null = null;

  async loadModel() {
    // Ensure TensorFlow.js is ready
    await tf.ready(); // Waits until TensorFlow.js is ready

    // Optionally, set the backend if required
    // await tf.setBackend('webgpu'); // Uncomment if you want to use WebGPU specifically

    const model = posenet.SupportedModels.MoveNet;
    this.detector = await posenet.createDetector(model);
  }

  async estimatePoses(inputTensor: any) {
    if (this.detector) {
      const poses = await this.detector.estimatePoses(inputTensor);
      return poses;
    } else {
      throw new Error('Detector is not initialized');
    }
  }
}
