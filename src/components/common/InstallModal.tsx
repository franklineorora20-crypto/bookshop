import React from 'react';
import { WindowsInstallerModal } from './WindowsInstallerModal.tsx';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Backwards compatibility wrapper directing all install modals to the Windows Desktop Installer.
 */
export const InstallModal: React.FC<InstallModalProps> = (props) => {
  return <WindowsInstallerModal {...props} />;
};
