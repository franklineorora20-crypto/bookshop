import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, MinusCircle } from 'lucide-react';

export interface StatusBadgeProps {
  status: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  label: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  icon,
  className = '',
  size = 'md',
}) => {
  const dotColor = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    neutral: 'bg-neutral-400',
    info: 'bg-sky-500',
  }[status];

  const textColor = {
    success: 'text-neutral-700',
    warning: 'text-amber-800',
    danger: 'text-rose-700',
    neutral: 'text-neutral-600',
    info: 'text-neutral-700',
  }[status];

  const sizeStyles = size === 'sm' ? 'text-[11px] gap-1.5' : 'text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center font-medium select-none ${textColor} ${sizeStyles} ${className}`}
    >
      {icon ? (
        <span className="shrink-0">{icon}</span>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      )}
      <span>{label}</span>
    </span>
  );
};
