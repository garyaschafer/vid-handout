export interface CapturedFrame {
  id: string;
  dataUrl: string; // Base64 image data
  timestamp: number;
  originalTimeFormatted: string;
}

export interface HandoutStep {
  stepNumber: number;
  title: string;
  description: string;
  tips?: string;
}

export interface HandoutData {
  title: string;
  summary: string;
  steps: HandoutStep[];
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  CAPTURE = 'CAPTURE',
  GENERATING = 'GENERATING',
  PREVIEW = 'PREVIEW',
  ERROR = 'ERROR',
}