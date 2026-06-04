import { useEffect, useState } from 'react';
import { ShieldAlert, Server, Activity, Terminal } from 'lucide-react';

interface MaintenanceProps {
  message?: string;
  eta?: string;
}

const SYSTEM_MESSAGES = [
  "INITIALIZING NEURAL NETWORKS...",
  "RECALIBRATING QUANTUM PROCESSORS...",
  "UPDATING ENCRYPTION PROTOCOLS...",
  "FLUSHING DATA BUFFERS...",
  "SECURING EXTERNAL CONNECTIONS...",
  "OPTIMIZING DATABASE CLUSTERS...",
  "VERIFYING SYSTEM INTEGRITY...",
];

export default function Maintenance({ message, eta }: MaintenanceProps) {
  const [typedMessage, setTypedMessage] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const displayMessage = message || "SYSTEM UNDERGOING SCHEDULED MAINTENANCE";

  // Typewriter effect for the main message
  useEffect(() => {
    let currentText = '';
    let i = 0;
    const interval = setInterval(() => {
      if (i < displayMessage.length) {
        currentText += displayMessage.charAt(i);
        setTypedMessage(currentText);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [displayMessage]);

  // Cycling system messages
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % SYSTEM_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Timer and progress
  useEffect(() => {
    if (!eta) {
      // Fake progress loop if no ETA
      const interval = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 1));
      }, 500);
      return () => clearInterval(interval);
    }

    const etaDate = new Date(eta).getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = etaDate - now;

      if (distance < 0) {
        setTimeLeft('MAINTENANCE COMPLETE - AWAITING SYSTEM RESTART');
        setProgress(100);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`T-MINUS ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

      // Calculate a rough progress percentage (assuming max 24 hours for progress scale, or just let it loop if unknown start time)
      // Since we don't know the start time, let's just make it a visual hash based on minutes/seconds
      const totalSecondsLeft = Math.floor(distance / 1000);
      const fakeTotalDuration = 3600; // Assume 1 hour default scale
      const perc = Math.max(0, Math.min(100, 100 - ((totalSecondsLeft / fakeTotalDuration) * 100)));
      setProgress(perc);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [eta]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#d8f3dc] font-mono flex flex-col items-center justify-center relative overflow-hidden selection:bg-[#74c69d] selection:text-black">

      {/* CRT Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b4332_1px,transparent_1px),linear-gradient(to_bottom,#1b4332_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Main Content */}
      <div className="z-10 flex flex-col items-center max-w-2xl w-full p-8 relative">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#52b788] opacity-50" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#52b788] opacity-50" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#52b788] opacity-50" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#52b788] opacity-50" />

        {/* Pulsing Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#52b788] blur-xl opacity-20 animate-pulse rounded-full" />
          <ShieldAlert size={64} className="text-[#52b788]" />
        </div>

        {/* Title & Message */}
        <div className="text-center space-y-4 mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#d8f3dc] to-[#52b788] leading-tight">
            HEXIS SYSTEM LOCK
          </h1>
          <div className="min-h-[3rem] md:h-6 flex items-center justify-center px-4">
            <p className="text-[#74c69d] text-sm sm:text-base md:text-lg tracking-widest uppercase leading-relaxed">
              {typedMessage}<span className="animate-pulse">_</span>
            </p>
          </div>
        </div>

        {/* Status Dashboard */}
        <div className="w-full bg-[#0a0a0a] border border-[#1b4332] rounded p-6 shadow-[0_0_30px_rgba(27,67,50,0.3)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Countdown / ETA */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#52b788] uppercase tracking-widest">
                <Activity size={14} /> Estimated Resumption
              </div>
              <div className="text-xl text-yellow-500 font-bold tracking-widest">
                {eta ? timeLeft : 'TBD - STANDBY'}
              </div>
              {eta && (
                <div className="text-[10px] text-yellow-600/70 tracking-widest uppercase">
                  Target: {new Date(eta).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#52b788] uppercase tracking-widest">
                <Server size={14} /> Current Operation
              </div>
              <div className="text-sm text-[#74c69d] font-bold tracking-wider animate-pulse">
                &gt; {SYSTEM_MESSAGES[statusIndex]}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-xs text-[#52b788] tracking-widest">
              <span>SYSTEM_REBOOT_SEQUENCE</span>
              <span>{Math.floor(progress)}%</span>
            </div>
            <div className="w-full h-1 bg-[#050505] border border-[#1b4332] overflow-hidden">
              <div
                className="h-full bg-[#52b788] shadow-[0_0_10px_#52b788] transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 flex flex-col items-center gap-4 text-xs tracking-widest text-[#1b4332]">
          <div className="flex items-center gap-2">
            <Terminal size={12} /> Hexis SECURE PROTOCOL v7.0
          </div>
          <a
            href="/admin/login"
            className="hover:text-[#52b788] transition-colors border-b border-transparent hover:border-[#52b788] pb-1"
          >
            ADMIN OVERRIDE
          </a>
        </div>
      </div>
    </div>
  );
}
