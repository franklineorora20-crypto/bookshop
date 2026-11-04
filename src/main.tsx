import '@fontsource/inter';
import '@fontsource/jetbrains-mono';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register service worker immediately to enable offline caching and installation
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.log('[KitabuPOS] Service Worker registered:', swUrl, registration);
    },
    onOfflineReady() {
      console.log('[KitabuPOS] App is ready for offline operation.');
    },
    onRegisterError(error) {
      console.error('[KitabuPOS] Service Worker registration failed:', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
