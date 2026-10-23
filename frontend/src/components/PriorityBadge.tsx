import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';

interface PriorityBadgeProps {
  level: string;
  score?: number;
  showScore?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ level, score, showScore = true }) => {
  const normalized = (level || 'Medium').toLowerCase();

  const styles: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    critical: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: AlertTriangle
    },
    high: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: AlertCircle
    },
    medium: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Info
    },
    low: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: ShieldCheck
    }
  };

  const current = styles[normalized] || styles.medium;
  const Icon = current.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{level}</span>
      {showScore && score !== undefined && (
        <span className="opacity-75 font-mono text-[11px]">({Math.round(score)})</span>
      )}
    </span>
  );
};
