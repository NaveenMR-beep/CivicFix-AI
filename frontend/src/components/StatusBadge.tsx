import React from 'react';
import { Clock, Eye, UserCheck, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useLanguage();

  const config: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
    submitted: {
      label: t.statusSubmitted,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: Clock
    },
    under_review: {
      label: t.statusUnderReview,
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: Eye
    },
    assigned: {
      label: t.statusAssigned,
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: UserCheck
    },
    in_progress: {
      label: t.statusInProgress,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: Wrench
    },
    resolved: {
      label: t.statusResolved,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      icon: CheckCircle2
    },
    rejected: {
      label: t.statusRejected,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: XCircle
    }
  };

  const item = config[status] || config.submitted;
  const Icon = item.icon;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5 font-medium',
    lg: 'text-base px-4 py-1.5 gap-2 font-semibold'
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full border ${item.bg} ${item.text} ${item.border} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {item.label}
    </span>
  );
};
