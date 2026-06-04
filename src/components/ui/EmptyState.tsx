import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export default function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-[#52b788]/50 border border-[#1b4332] bg-[#0d2818]/30 border-dashed m-4">
      <Icon className="w-16 h-16 mb-4 opacity-50" />
      <p className="font-mono tracking-widest uppercase text-center">{message}</p>
    </div>
  );
}
