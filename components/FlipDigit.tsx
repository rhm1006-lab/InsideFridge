
import React from 'react';

export const FlipDigit = ({ value }: { value: string | number }) => {
  const strValue = String(value).padStart(2, '0');
  return (
    <div className="relative bg-white rounded-xl w-20 h-28 flex flex-col items-center justify-center shadow-lg border border-slate-200">
      {/* Top half shine */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-slate-50 rounded-t-xl z-10 pointer-events-none opacity-50"></div>
      
      {/* The Number */}
      <span className="text-7xl font-bold text-slate-800 font-mono z-0 tracking-tighter leading-none">
        {strValue}
      </span>
      
      {/* Split Line */}
      <div className="absolute top-1/2 w-full h-[1px] bg-slate-300 z-20"></div>
      
      {/* Side notches for realism */}
      <div className="absolute top-1/2 left-0 w-1 h-2 bg-slate-300 -translate-y-1/2 rounded-r"></div>
      <div className="absolute top-1/2 right-0 w-1 h-2 bg-slate-300 -translate-y-1/2 rounded-l"></div>
    </div>
  );
};
