import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requiredWord?: string; // If provided, user must type this word to enable confirm button
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  requiredWord,
  loading: externalLoading = false,
}) => {
  const [typedWord, setTypedWord] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  const loading = externalLoading || internalLoading;
  const isConfirmDisabled = Boolean(requiredWord && typedWord.trim() !== requiredWord.trim());

  const handleConfirm = async () => {
    if (isConfirmDisabled || loading) return;
    try {
      setInternalLoading(true);
      await onConfirm();
      setTypedWord('');
      onClose();
    } catch {
      // Keep open if error handled outside
    } finally {
      setInternalLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setTypedWord('');
    onClose();
  };

  const icon = {
    danger: <AlertCircle className="w-5 h-5 text-rose-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    primary: <Info className="w-5 h-5 text-blue-600" />,
  }[variant];

  const iconBg = {
    danger: 'bg-rose-50 border-rose-200',
    warning: 'bg-amber-50 border-amber-200',
    primary: 'bg-blue-50 border-blue-200',
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="sm" showCloseButton={!loading}>
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl border shrink-0 ${iconBg}`}>{icon}</div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-neutral-900 tracking-tight">{title}</h4>
            <div className="text-xs text-neutral-600 leading-relaxed">{message}</div>
          </div>
        </div>

        {requiredWord && (
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="block text-xs font-medium text-neutral-700">
              Type <strong className="font-mono text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded">{requiredWord}</strong> to confirm:
            </label>
            <input
              type="text"
              autoFocus
              value={typedWord}
              onChange={(e) => setTypedWord(e.target.value)}
              placeholder={`Type "${requiredWord}"`}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <Button variant="outline" size="md" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={handleConfirm}
            loading={loading}
            disabled={isConfirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
