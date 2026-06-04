import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (val: string) => void;
  label?: string;
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate hours 00-23 and minutes 00, 05, ... 55
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const currentHour = value ? value.split(':')[0] : '09';
  const currentMinute = value ? value.split(':')[1] : '00';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto scroll to selected time when opened
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('.selected-time') as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'center' });
      }
    }
  }, [isOpen]);

  const handleHourSelect = (h: string) => {
    onChange(`${h}:${currentMinute}`);
  };

  const handleMinuteSelect = (m: string) => {
    onChange(`${currentHour}:${m}`);
    // Optional: could close after minute selection, but keeping it open lets them tweak both
  };

  return (
    <div className="relative font-mono w-full" ref={containerRef}>
      {label && <label className="block text-xs text-[#95d5b2] mb-1 tracking-wider">{label}</label>}
      
      <div 
        className="w-full bg-[#0a1a0f] border border-[#1b4332] focus-within:border-[#52b788] px-3 py-2 flex items-center justify-between cursor-pointer text-sm transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-[#d8f3dc]" : "text-[#2d6a4f]"}>
          {value || "SELECT TIME"}
        </span>
        <Clock size={16} className="text-[#52b788]" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#0d2818] border border-[#1b4332] shadow-xl w-48 select-none flex h-40">
          
          <div ref={scrollRef} className="w-1/2 overflow-y-auto border-r border-[#1b4332] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#52b788] [&::-webkit-scrollbar-track]:bg-[#0a1a0f]">
            {hours.map(h => {
              const isSelected = h === currentHour;
              return (
                <div 
                  key={`h-${h}`}
                  className={`h-7 flex items-center justify-center text-xs cursor-pointer transition-colors ${isSelected ? 'bg-[#52b788] text-[#0a1a0f] font-bold selected-time' : 'text-[#d8f3dc] hover:bg-[#1b4332]'}`}
                  onClick={() => handleHourSelect(h)}
                >
                  {h}
                </div>
              );
            })}
          </div>

          <div className="w-1/2 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#52b788] [&::-webkit-scrollbar-track]:bg-[#0a1a0f]">
            {minutes.map(m => {
              const isSelected = m === currentMinute;
              return (
                <div 
                  key={`m-${m}`}
                  className={`h-7 flex items-center justify-center text-xs cursor-pointer transition-colors ${isSelected ? 'bg-[#52b788] text-[#0a1a0f] font-bold selected-time' : 'text-[#d8f3dc] hover:bg-[#1b4332]'}`}
                  onClick={() => handleMinuteSelect(m)}
                >
                  {m}
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
