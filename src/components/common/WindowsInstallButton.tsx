import React from 'react';
import { WindowsIcon } from './WindowsIcon.tsx';

const releasesUrl = 'https://github.com/franklineorora20-crypto/bookshop/releases/latest';

interface WindowsInstallButtonProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'banner' | 'login' | 'settings';
  collapsed?: boolean;
}

export const WindowsInstallButton: React.FC<WindowsInstallButtonProps> = ({
  className = '',
  variant = 'header',
  collapsed = false,
}) => {
  if (variant === 'header') {
    return (
      <a
        href={releasesUrl}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-300/80 bg-white hover:bg-neutral-50 active:scale-[0.98] text-neutral-800 text-xs font-semibold shadow-xs transition-all tactile-btn ${className}`}
        title="Download the Windows installer"
        aria-label="Download Windows installer"
      >
        <WindowsIcon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
        <span className="hidden sm:inline">Windows Installer</span>
        <span className="sm:hidden">Install</span>
      </a>
    );
  }

  if (variant === 'sidebar') {
    return (
      <a
        href={releasesUrl}
        target="_blank"
        rel="noreferrer"
        className={`w-full flex items-center ${
          collapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2'
        } rounded-lg bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-700/80 hover:border-teal-500/50 text-neutral-200 hover:text-white text-xs font-semibold transition-all duration-120 tactile-btn min-h-[40px] shadow-xs group ${className}`}
        title="Download the Windows installer"
      >
        {collapsed ? (
          <WindowsIcon className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <WindowsIcon className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px]">Windows Installer</span>
            </div>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-950/80 border border-teal-500/30 text-teal-300">
              Win x64
            </span>
          </>
        )}
      </a>
    );
  }

  if (variant === 'login') {
    return (
      <a
        href={releasesUrl}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 rounded-xl transition-colors tactile-btn border border-neutral-200 shadow-2xs ${className}`}
      >
        <WindowsIcon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
        <span>Windows Desktop Installer (Windows 10 / 11 64-bit)</span>
      </a>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`p-3 rounded-xl bg-neutral-900 text-white flex items-center justify-between gap-3 shadow-md border border-neutral-700 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <WindowsIcon className="w-4 h-4 text-teal-400 shrink-0" />
          <p className="text-xs">Install KitabuPOS natively on Windows 10/11 with local data storage.</p>
        </div>
        <a
          href={releasesUrl}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shrink-0 transition-colors"
        >
          Get installer
        </a>
      </div>
    );
  }

  return (
    <a
      href={releasesUrl}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-600 text-white transition-colors tactile-btn ${className}`}
    >
      <WindowsIcon className="w-3.5 h-3.5" />
      <span>Get Windows installer</span>
    </a>
  );
};
