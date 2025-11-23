import React from 'react';
import { HandoutData, CapturedFrame } from '../types';

interface HandoutDisplayProps {
  data: HandoutData;
  frames: CapturedFrame[];
  onReset: () => void;
}

const HandoutDisplay: React.FC<HandoutDisplayProps> = ({ data, frames, onReset }) => {
  // Map step data back to frames by index. 
  // Assumption: frames were sent sorted, and API returns steps in same order.
  const stepsWithImages = data.steps.map((step, index) => {
    // Sort frames again to be safe
    const sortedFrames = [...frames].sort((a, b) => a.timestamp - b.timestamp);
    return {
      ...step,
      image: sortedFrames[index] || null
    };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full bg-slate-200 overflow-y-auto relative print:overflow-visible print:h-auto print:bg-white print:block">
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button 
          onClick={onReset}
          className="bg-white text-slate-700 px-4 py-2 rounded-lg shadow-md hover:bg-slate-50 font-medium transition-colors border border-slate-300"
        >
          Start Over
        </button>
        <button 
          onClick={handlePrint}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008h-.008V10.5Zm-3 0h.008v.008h-.008V10.5Z" />
          </svg>
          Print / Save as PDF
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto min-h-[297mm] bg-white shadow-2xl my-8 p-[20mm] box-border text-slate-800 print:my-0 print:shadow-none print:w-full print:max-w-full print:mx-0 print:p-[20mm]">
        {/* Header */}
        <header className="border-b-4 border-indigo-600 pb-6 mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{data.title}</h1>
          <p className="text-lg text-slate-600 leading-relaxed italic">{data.summary}</p>
        </header>

        {/* Steps */}
        <div className="space-y-8">
          {stepsWithImages.map((step, idx) => (
            <div key={idx} className="flex gap-6 break-inside-avoid page-break mb-8 items-start">
               {/* Step Number */}
               <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl">
                    {step.stepNumber}
                  </div>
               </div>

               <div className="flex-1">
                 <h3 className="text-xl font-bold mb-2 text-slate-800">{step.title}</h3>
                 
                 {step.image && (
                   <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-slate-50 inline-block max-w-full">
                     <img 
                      src={step.image.dataUrl} 
                      alt={`Step ${step.stepNumber}`} 
                      className="max-h-[300px] w-auto object-contain"
                     />
                   </div>
                 )}
                 
                 <p className="text-slate-700 mb-3 leading-relaxed">{step.description}</p>
                 
                 {step.tips && (
                   <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r text-sm text-amber-800">
                     <strong>Tip:</strong> {step.tips}
                   </div>
                 )}
               </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-slate-400 text-sm flex justify-between">
           <span>Generated with Gemini 2.5 Flash</span>
           <span>{new Date().toLocaleDateString()}</span>
        </footer>
      </div>
    </div>
  );
};

export default HandoutDisplay;