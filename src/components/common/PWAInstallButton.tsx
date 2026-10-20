import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside installed standalone window / Electron, suppress button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // Only render if browser supports beforeinstallprompt or is iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-medium shadow-xs transition-colors tactile-btn ${className}`}
          title="Install KitabuPOS app onto your device"
        >
          <Download className="w-3.5 h-3.5 text-neutral-700" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors tactile-btn ${className}`}
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Install Desktop/Mobile App</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1 rounded bg-neutral-800 text-neutral-300">
            PWA
          </span>
        </button>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-neutral-200 text-neutral-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-neutral-800" />
                <h3 className="text-sm font-semibold text-neutral-900">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-600">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="w-5 h-5 rounded-full bg-neutral-200 font-mono font-bold text-[11px] text-neutral-700 flex items-center justify-center shrink-0">
                  1
                </span>
                <p>
                  In the Safari toolbar at the bottom of your screen, tap the{' '}
                  <strong className="text-neutral-900 inline-flex items-center gap-1">
                    <Share className="w-3.5 h-3.5 inline text-blue-600" /> Share
                  </strong>{' '}
                  button.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="w-5 h-5 rounded-full bg-neutral-200 font-mono font-bold text-[11px] text-neutral-700 flex items-center justify-center shrink-0">
                  2
                </span>
                <p>
                  Scroll down the share sheet and tap{' '}
                  <strong className="text-neutral-900">Add to Home Screen</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="w-5 h-5 rounded-full bg-neutral-200 font-mono font-bold text-[11px] text-neutral-700 flex items-center justify-center shrink-0">
                  3
                </span>
                <p>
                  Tap <strong className="text-neutral-900">Add</strong> in the top right. KitabuPOS will launch offline in its own standalone app window!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-neutral-900 text-white font-medium text-xs hover:bg-neutral-800 transition-colors tactile-btn"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
