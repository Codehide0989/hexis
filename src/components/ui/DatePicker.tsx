import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, parseISO
} from 'date-fns';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  label?: string;
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal month when value changes externally
  useEffect(() => {
    if (value) {
      const parsed = parseISO(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentMonth(parsed);
      }
    }
  }, [value]);

  const selectedDate = value ? parseISO(value) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MM-dd-yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  
  const onDateClick = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onChange(format(today, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className="relative font-mono w-full" ref={containerRef}>
      {label && <label className="block text-xs text-[#95d5b2] mb-1 tracking-wider">{label}</label>}
      
      <div 
        className="w-full bg-[#0a1a0f] border border-[#1b4332] focus-within:border-[#52b788] px-3 py-2 flex items-center justify-between cursor-pointer text-sm transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-[#d8f3dc]" : "text-[#2d6a4f]"}>
          {value ? format(parseISO(value), dateFormat) : "SELECT DATE"}
        </span>
        <CalendarIcon size={16} className="text-[#52b788]" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#0d2818] border border-[#1b4332] p-3 shadow-xl w-64 select-none">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button onClick={prevMonth} className="text-[#52b788] hover:text-[#d8f3dc] transition-colors"><ChevronLeft size={16}/></button>
            <span className="text-[#d8f3dc] font-bold text-sm tracking-wider uppercase">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button onClick={nextMonth} className="text-[#52b788] hover:text-[#d8f3dc] transition-colors"><ChevronRight size={16}/></button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] text-[#52b788] uppercase font-bold">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const isCurrentMonth = isSameMonth(day, monthStart);

              let className = "w-8 h-8 flex items-center justify-center text-xs cursor-pointer transition-colors ";
              
              if (isSelected) {
                className += "bg-[#52b788] text-[#0a1a0f] font-bold ";
              } else if (!isCurrentMonth) {
                className += "text-[#2d6a4f] hover:bg-[#1b4332] ";
              } else {
                className += "text-[#d8f3dc] hover:bg-[#1b4332] ";
              }

              if (isTodayDate && !isSelected) {
                className += "border border-[#52b788] ";
              }

              return (
                <div 
                  key={i} 
                  className={className}
                  onClick={() => onDateClick(day)}
                >
                  {format(day, "d")}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#1b4332]">
            <button onClick={handleToday} className="text-[#52b788] text-xs hover:text-[#d8f3dc] uppercase tracking-wider transition-colors">Today</button>
            <button onClick={handleClear} className="text-[#95d5b2] text-xs hover:text-[#d8f3dc] uppercase tracking-wider transition-colors">Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
