import React from 'react';

interface HexisLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
  className?: string;
}

export function HexisLogo({ 
  size = 32, 
  showText = true, 
  textSize = 'text-xl', 
  className = '' 
}: HexisLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img 
        src="/hesixpng.png" 
        width={size} 
        height={size} 
        alt="HEXIS" 
        className="object-contain shrink-0"
        style={{ width: size, height: size }}
      />

      {showText && (
        <div className="flex flex-col leading-none">
          <span 
            className={`font-mono font-bold text-[#52b788] tracking-[0.2em] leading-none ${textSize}`}
          >
            HEXIS
          </span>
          <span className="font-mono text-[8px] text-[#1b4332] tracking-[0.15em] leading-none mt-[3px]">
            v1.0.0
          </span>
        </div>
      )}
    </div>
  );
}
