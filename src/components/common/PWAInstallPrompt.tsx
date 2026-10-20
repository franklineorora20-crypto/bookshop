import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Laptop, Smartphone, Share, CheckCircle2, Zap, Printer, HardDrive } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

const DISMISS_KEY = 'kitabupos_pwa_prompt_dismissed_at';
const DISMISS_HOURS = 24; // Suppress auto-popup for 24 hours after dismiss

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // If already installed in standalone mode, never show
    if (isInstalled) {
      setIsVisible(false);
      return;
    }

    // Check if dismissed recently
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const diffHours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
        if (diffHours < DISMISS_HOURS) {
          return;
        }
      }
    } catch {
      // localStorage may fail in private mode
    }

    // If installable or iOS, show prompt after a short pleasant delay (1.2s)
    if (isInstallable || isIOS) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isIOS]);

  // Listen for explicit manual triggers (from Header or Settings)
  useEffect(() => {
    const handleManualOpen = () => {
      setIsVisible(true);
    };

    window.addEventListener('kitabupos:show-install-prompt', handleManualOpen);
    return () => window.removeEventListener('kitabupos:show-install-prompt', handleManualOpen);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // Ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const accepted = await install();
        if (accepted) {
          setIsVisible(false);
        }
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
            className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-md z-40"
            role="dialog"
            aria-labelledby="pwa-prompt-title"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200/90 p-4 sm:p-5 text-neutral-900 overflow-hidden backdrop-blur-md">
              {/* Subtle top brand accent line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-neutral-900" />

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3.5 right-3.5 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Close install prompt"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5">
                {/* App Icon */}
                <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 p-1 flex items-center justify-center shrink-0 shadow-xs">
                  <img
                    src="/pwa-192x192.png"
                    alt="KitabuPOS Logo"
                    className="w-10 h-10 rounded-lg object-contain"
                  />
                </div>

                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.2 rounded">
                      Offline Desktop & Mobile App
                    </span>
                  </div>
                  <h3 id="pwa-prompt-title" className="text-sm font-bold text-neutral-950 tracking-tight leading-snug">
                    Install KitabuPOS
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    Install for a fast, borderless native window experience with instant local SQLite loading, offline barcode scanning, and direct receipt printing.
                  </p>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-neutral-100 text-[11px] text-neutral-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Instant Speed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Local SQLite</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Direct Print</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-1">
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all tactile-btn"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isInstalling ? 'Installing...' : isIOS ? 'Install on iOS' : 'Install Application'}</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 text-neutral-600 hover:text-neutral-900 text-xs font-medium transition-colors tactile-btn"
                >
                  Not Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Safari Guided Installation Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-neutral-900"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Install on iPhone or iPad</h3>
                  <p className="text-[11px] text-neutral-500">Run full-screen from your Home Screen</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-600">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="leading-snug">
                  In Safari, tap the <strong className="text-neutral-900 inline-flex items-center gap-1 font-semibold"><Share className="w-3.5 h-3.5 text-blue-600 inline" /> Share</strong> button at the bottom of the screen.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="leading-snug">
                  Scroll down the share sheet and tap <strong className="text-neutral-900 font-semibold">Add to Home Screen</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="leading-snug">
                  Tap <strong className="text-neutral-900 font-semibold">Add</strong> in the top right. KitabuPOS will launch offline in its own standalone app window!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSGuide(false);
                setIsVisible(false);
              }}
              className="mt-5 w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors shadow-xs tactile-btn"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};
