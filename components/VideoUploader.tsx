import React, { useRef } from 'react';

interface VideoUploaderProps {
  onVideoSelected: (file: File) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onVideoSelected(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Create Video Handouts</h1>
        <p className="text-slate-500 mb-8">
          Upload a video file to start capturing frames. We'll use AI to generate step-by-step instructions.
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          Select Video File
        </button>
        
        <input
          type="file"
          accept="video/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <p className="mt-4 text-xs text-slate-400">
          Note: Due to browser security restrictions, we cannot process YouTube URLs directly. Please upload a .mp4, .webm, or .mov file.
        </p>
      </div>
    </div>
  );
};

export default VideoUploader;
