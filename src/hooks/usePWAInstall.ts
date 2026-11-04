import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global cached prompt across component mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isChromeOrEdge, setIsChromeOrEdge] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSWActive, setIsSWActive] = useState(false);

  useEffect(() => {
    // 1. Detect standalone mode (already installed PWA or Electron)
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        Boolean((window as any).electronAPI) ||
        window.navigator.userAgent.toLowerCase().includes('electron'));
    setIsInstalled(isStandalone);

    // 2. Detect platform & browser
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));
    setIsWindows(/win/.test(ua));
    setIsChromeOrEdge(/chrome|edg/.test(ua) && !/opr|brave/.test(ua));

    // 3. Service Worker registration check
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setIsSWActive(true)).catch(() => {});
    }

    // 4. Online / Offline network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. beforeinstallprompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      promptListeners.forEach((listener) => listener(promptEvent));
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      promptListeners.forEach((listener) => listener(null));
    };

    const listener = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };
    promptListeners.add(listener);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      promptListeners.delete(listener);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    const prompt = deferredPrompt || globalDeferredPrompt;
    if (!prompt) return 'unsupported';

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        promptListeners.forEach((l) => l(null));
      }
      return outcome;
    } catch (err) {
      console.error('Failed to trigger PWA install prompt:', err);
      return 'unsupported';
    }
  }, [deferredPrompt]);

  const isElectron =
    typeof window !== 'undefined' &&
    (Boolean((window as any).electronAPI) || window.navigator.userAgent.toLowerCase().includes('electron'));

  const platform = isElectron
    ? 'Desktop App (Electron)'
    : isWindows
    ? 'Windows PC'
    : isAndroid
    ? 'Android Device'
    : isIOS
    ? 'Apple iOS'
    : 'Desktop / Laptop';

  return {
    isInstallable: Boolean(deferredPrompt || globalDeferredPrompt),
    isInstalled: isInstalled || isElectron,
    isIOS,
    isAndroid,
    isWindows,
    isChromeOrEdge,
    isOnline,
    isSWActive,
    isOfflineReady: isSWActive,
    isElectron,
    platform,
    install,
  };
}
