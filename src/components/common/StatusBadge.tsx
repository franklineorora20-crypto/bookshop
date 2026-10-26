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
  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    danger: 'bg-rose-50 text-rose-800 border-rose-200/80',
    neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200/80',
  }[status];

  const defaultIcons = {
    success: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-hidden="true" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden="true" />,
    danger: <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" aria-hidden="true" />,
    neutral: <MinusCircle className="w-3.5 h-3.5 shrink-0 text-neutral-500" aria-hidden="true" />,
    info: <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" aria-hidden="true" />,
  }[status];

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${styles} ${sizeStyles} ${className} select-none`}
    >
      {icon || defaultIcons}
      <span>{label}</span>
    </span>
  );
};
