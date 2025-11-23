import React, { useRef, useState, useEffect } from 'react';
import { CapturedFrame } from '../types';
import { filterBestFrames } from '../services/geminiService';

interface FrameCapturerProps {
  videoFile: File;
  onGenerate: (frames: CapturedFrame[]) => void;
  onBack: () => void;
}

const FrameCapturer: React.FC<FrameCapturerProps> = ({ videoFile, onGenerate, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const addLog = (msg: string) => {
    console.log(`[AutoSelect] ${msg}`);
    setDebugLogs(prev => [...prev.slice(-3), msg]); // Keep last 4 logs on screen
  };

  const createFrameFromVideo = (video: HTMLVideoElement): CapturedFrame | null => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // This might throw a SecurityError if the video is tainted
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            const timestamp = video.currentTime;
            const formatTime = (seconds: number) => {
              const m = Math.floor(seconds / 60);
              const s = Math.floor(seconds % 60);
              return `${m}:${s.toString().padStart(2, '0')}`;
            };

            return {
              id: Math.random().toString(36).substr(2, 9),
              dataUrl,
              timestamp,
              originalTimeFormatted: formatTime(timestamp),
            };
        } catch (e: any) {
            console.error("Frame creation error:", e);
            throw new Error(`Canvas export failed (Security/CORS): ${e.message}`);
        }
      }
    }
    return null;
  };

  const captureFrame = () => {
    if (videoRef.current) {
      try {
        const frame = createFrameFromVideo(videoRef.current);
        if (frame) {
          setFrames((prev) => [...prev, frame]);
        }
      } catch (e: any) {
        alert("Could not capture frame. " + e.message);
      }
    }
  };

  const handleAutoCapture = () => {
    const video = videoRef.current;
    if (!video || !canvasRef.current) {
        alert("System Error: Video player or canvas not found.");
        return;
    }

    if (video.readyState < 2) {
       alert("Video is not ready. Please play the video for one second and try again.");
       return;
    }

    if (isNaN(video.duration) || video.duration === Infinity) {
       alert("Cannot determine video duration. Please play the video briefly to load metadata.");
       return;
    }
    
    if (!window.confirm("This will clear your current frames and automatically select new ones. Continue?")) {
      return;
    }

    // 1. Update UI State
    setFrames([]); 
    setIsAnalyzing(true);
    setDebugLogs([]);
    setStatusMessage("Initializing auto-select...");
    addLog("Process started...");

    // 2. Defer processing
    setTimeout(async () => {
      try {
          const duration = video.duration;
          addLog(`Duration: ${duration.toFixed(1)}s`);

          const steps = 12; 
          const interval = duration / (steps + 1);
          const candidates: CapturedFrame[] = [];
          
          video.pause();
          setIsPlaying(false);
          
          // 3. Scan Video Loop
          for (let i = 1; i <= steps; i++) {
            setStatusMessage(`Scanning video... Frame ${i} of ${steps}`);
            
            // Yield to UI
            await new Promise(r => setTimeout(r, 50)); 

            const timestamp = interval * i;
            video.currentTime = timestamp;

            // Robust seek wait
            await new Promise<void>(resolve => {
               const onSeeked = () => {
                   video.removeEventListener('seeked', onSeeked);
                   resolve();
               };
               video.addEventListener('seeked', onSeeked, { once: true });
               setTimeout(onSeeked, 1500); // Timeout fallback
            });

            await new Promise(r => setTimeout(r, 150)); // Paint delay

            const frame = createFrameFromVideo(video);
            if (frame) {
               candidates.push(frame);
            } else {
               addLog(`Skipped frame at ${timestamp.toFixed(1)}s`);
            }
          }
          
          // 4. Send to AI
          if (candidates.length > 0) {
              setStatusMessage("AI is analyzing frames...");
              addLog(`Analyzing ${candidates.length} frames...`);
              
              await new Promise(r => setTimeout(r, 500)); 

              const selectedIndices = await filterBestFrames(candidates);
              
              addLog(`Selected ${selectedIndices.length} frames.`);

              const finalFrames = selectedIndices
                .map(idx => candidates[idx])
                .filter(f => f !== undefined);
                
              setFrames(finalFrames);
          } else {
              throw new Error("No valid frames could be captured.");
          }

      } catch (err: any) {
            console.error("Auto-capture error:", err);
            addLog(`ERROR: ${err.message}`);
            // Show the actual error message to the user
            alert(`Auto-select failed.\n\nReason: ${err.message}\n\nPlease try manually capturing frames.`);
      } finally {
            setIsAnalyzing(false);
            setStatusMessage("");
            // Leave the logs visible for a moment if needed, or clear?
            // setDebugLogs([]); 
      }
    }, 100);
  };

  const removeFrame = (id: string) => {
    setFrames((prev) => prev.filter(f => f.id !== id));
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden relative">
      {/* Analysis Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300">
           <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in duration-300">
             <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">Auto-select is underway</h3>
             <p className="text-slate-600 font-medium animate-pulse mb-4">{statusMessage}</p>
             
             {/* Visible Debug Log */}
             <div className="w-full bg-slate-100 rounded p-2 text-xs text-left font-mono text-slate-500 h-24 overflow-hidden border border-slate-200">
                {debugLogs.map((log, i) => (
                    <div key={i} className="truncate">&gt; {log}</div>
                ))}
             </div>
           </div>
        </div>
      )}

      {/* Left: Video Player */}
      <div className="flex-1 flex flex-col p-6 min-w-0 relative z-0">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm font-medium">
            ← Back
          </button>
          <div className="text-sm font-semibold text-slate-600 bg-white px-3 py-1 rounded-full shadow-sm">
            Step 1: Capture Key Moments
          </div>
        </div>

        <div className="flex-1 bg-black rounded-2xl shadow-lg overflow-hidden relative flex items-center justify-center group">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            crossOrigin="anonymous"
            controls={false} // Custom controls
          />
          
          {/* Custom Play Overlay */}
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer"
            onClick={togglePlay}
          >
             {!isPlaying && !isAnalyzing && (
               <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
               </div>
             )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Video Controls Bar */}
        <div className="mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 justify-between relative z-10">
            <div className="flex gap-2">
                <button 
                  onClick={togglePlay}
                  disabled={isAnalyzing}
                  className="p-3 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                  ) }
                </button>
                <div className="flex flex-col justify-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Current Time</span>
                    <span className="font-mono text-slate-800">{videoRef.current ? (Math.round(videoRef.current.currentTime * 10) / 10).toFixed(1) : "0.0"}s</span>
                </div>
            </div>

            <div className="flex gap-2 flex-1 justify-end">
              {/* Auto Capture Button */}
              <button
                onClick={handleAutoCapture}
                disabled={isAnalyzing}
                className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                title="Automatically find key steps"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM1.5 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 1.5 1.5ZM1.5 19.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75ZM22.5 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25a.75.75 0 0 1 .75-.75ZM22.5 19.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                  </svg>
                <span>Auto-Select</span>
              </button>

              {/* Manual Capture Button */}
              <button
                onClick={captureFrame}
                disabled={isAnalyzing}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                <span>Capture Frame</span>
              </button>
            </div>
        </div>
      </div>

      {/* Right: Gallery Sidebar */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-10">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800">Captured Frames ({frames.length})</h2>
          <p className="text-xs text-slate-500 mt-1">Manually capture or use Auto-Select.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {frames.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <p className="text-sm text-center">Images will appear here</p>
            </div>
          ) : (
            frames.map((frame, index) => (
              <div key={frame.id} className="relative group bg-slate-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removeFrame(frame.id)}
                    className="bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                    title="Remove frame"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
                <img src={frame.dataUrl} alt={`Frame at ${frame.originalTimeFormatted}`} className="w-full h-auto rounded border border-slate-300" />
                <div className="mt-2 flex justify-between items-center px-1">
                    <span className="text-xs font-semibold text-slate-500">Step {index + 1}</span>
                    <span className="text-xs text-slate-400 font-mono">{frame.originalTimeFormatted}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            disabled={frames.length === 0 || isAnalyzing}
            onClick={() => onGenerate(frames)}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm
              ${frames.length === 0 || isAnalyzing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            Generate Handout
          </button>
        </div>
      </div>
    </div>
  );
};

export default FrameCapturer;