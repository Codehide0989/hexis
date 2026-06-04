import React from 'react';

export default function TableSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-4">
      <div className="h-10 bg-[#1b4332]/50 border border-[#1b4332] w-full mb-4"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border border-[#1b4332]/30 bg-[#0d2818]/50">
          <div className="h-4 bg-[#1b4332]/70 w-1/4"></div>
          <div className="h-4 bg-[#1b4332]/70 w-1/2"></div>
          <div className="h-4 bg-[#1b4332]/70 w-1/4"></div>
        </div>
      ))}
    </div>
  );
}
