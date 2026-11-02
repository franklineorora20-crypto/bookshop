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
      'inline-flex items-center justify-center font-medium rounded-lg transition-all active:scale-[0.98] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer';

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2 min-h-[44px] gap-2',
      lg: 'text-base px-5 py-2.5 min-h-[48px] gap-2.5 font-medium',
    }[size];

    const variantStyles = {
      primary: 'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950 border border-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
      secondary: 'bg-white text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100 border border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)] border border-rose-600 focus-visible:ring-rose-600',
      outline: 'bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
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
