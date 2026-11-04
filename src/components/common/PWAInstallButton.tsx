import React from 'react';
import { WindowsInstallButton } from './WindowsInstallButton.tsx';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'banner' | 'login' | 'settings';
  collapsed?: boolean;
}

/**
 * Backwards compatibility wrapper directing all install triggers to the Windows Desktop Installer.
 */
export const PWAInstallButton: React.FC<PWAInstallButtonProps> = (props) => {
  return <WindowsInstallButton {...props} />;
};
