import React, { useState } from 'react';
import VideoUploader from './components/VideoUploader';
import FrameCapturer from './components/FrameCapturer';
import HandoutDisplay from './components/HandoutDisplay';
import { generateHandoutContent } from './services/geminiService';
import { AppState, CapturedFrame, HandoutData } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [handoutData, setHandoutData] = useState<HandoutData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVideoSelected = (file: File) => {
    setVideoFile(file);
    setAppState(AppState.CAPTURE);
  };

  const handleGenerate = async (capturedFrames: CapturedFrame[]) => {
    setFrames(capturedFrames);
    setAppState(AppState.GENERATING);
    setError(null);

    try {
      const data = await generateHandoutContent(capturedFrames);
      setHandoutData(data);
      setAppState(AppState.PREVIEW);
    } catch (err) {
      console.error(err);
      setError("We encountered an issue while generating your handout. This might be due to network connectivity or high traffic.");
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.UPLOAD);
    setVideoFile(null);
    setFrames([]);
    setHandoutData(null);
    setError(null);
  };

  return (
    <div className="h-full w-full">
      {appState === AppState.UPLOAD && (
        <VideoUploader onVideoSelected={handleVideoSelected} />
      )}

      {appState === AppState.CAPTURE && videoFile && (
        <FrameCapturer 
          videoFile={videoFile} 
          onGenerate={handleGenerate} 
          onBack={() => setAppState(AppState.UPLOAD)}
        />
      )}

      {appState === AppState.GENERATING && (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 z-50 fixed inset-0">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Video Frames</h2>
          <p className="text-slate-500 max-w-md text-center px-4">
            Gemini is watching your frames, identifying steps, and writing instructions...
          </p>
        </div>
      )}

      {appState === AppState.ERROR && (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 z-50 fixed inset-0 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Generation Failed</h2>
            <p className="text-slate-500 mb-8">
              {error || "Something went wrong while communicating with Gemini."}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setAppState(AppState.CAPTURE)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                Back to Editor
              </button>
              <button
                onClick={() => handleGenerate(frames)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {appState === AppState.PREVIEW && handoutData && (
        <HandoutDisplay 
          data={handoutData} 
          frames={frames} 
          onReset={handleReset} 
        />
      )}
    </div>
  );
};

export default App;