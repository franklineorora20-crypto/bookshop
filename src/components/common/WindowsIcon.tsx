import React from 'react';

interface WindowsIconProps {
  className?: string;
  size?: number;
}

export const WindowsIcon: React.FC<WindowsIconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-hidden="true"
  >
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75V22.1L0 20.701M10.949 12.6H24V24l-13.051-1.802" />
  </svg>
);
