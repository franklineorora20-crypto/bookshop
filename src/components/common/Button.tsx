import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all tactile-btn select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2 min-h-[44px] gap-2', // meets 44px touch target
      lg: 'text-base px-5 py-2.5 min-h-[48px] gap-2.5 font-semibold',
    }[size];

    const variantStyles = {
      primary: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs border border-neutral-900',
      secondary: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200/80 shadow-xs',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs border border-rose-600 focus-visible:ring-rose-600',
      outline: 'bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-300 shadow-xs',
      ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
