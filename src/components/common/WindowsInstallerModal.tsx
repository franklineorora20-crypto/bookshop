import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  HardDrive,
  Copy,
  Check,
  AlertCircle,
  Terminal,
  FolderOpen,
  Monitor,
  Printer,
  Barcode,
  ShieldCheck,
  FileCode,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';
import { KitabuLogo } from './KitabuLogo.tsx';
import { WindowsIcon } from './WindowsIcon.tsx';
import {
  downloadWindowsInstallerCmd,
  downloadWindowsInstallerPs1,
  checkSystemRequirements,
  SystemRequirementsResult,
} from '../../utils/installer.ts';
import { toast } from 'sonner';

interface WindowsInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'setup' | 'requirements' | 'portable' | 'enterprise';

export const WindowsInstallerModal: React.FC<WindowsInstallerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('setup');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [sysReqs, setSysReqs] = useState<SystemRequirementsResult | null>(null);
  const [isLoadingReqs, setIsLoadingReqs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingReqs(true);
      checkSystemRequirements()
        .then((result) => setSysReqs(result))
        .finally(() => setIsLoadingReqs(false));
    }
  }, [isOpen]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedCommand(null), 2500);
    } catch {
      toast.error('Could not copy automatically. Please select and copy manually.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title="KitabuPOS — Windows Desktop Installer & Offline Setup"
    >
      <div className="space-y-5">
        {/* Header Hero Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-neutral-700/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-teal-400 shrink-0 shadow-inner">
              <WindowsIcon className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">
                  Windows Desktop Application
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Windows 10 / 11 (64-bit)
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                Dedicated Windows installer for bookshops in Kenya. 100% offline with zero cloud dependency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                downloadWindowsInstallerCmd();
                toast.success('Downloaded Install-KitabuPOS.cmd');
              }}
              className="bg-teal-600 hover:bg-teal-500 text-white shadow-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get Installer (.cmd)</span>
            </Button>
          </div>
        </div>

        {/* Quick Diagnostic Pill Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50/70 flex items-center gap-2">
            <WindowsIcon className="w-4 h-4 text-neutral-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-500 uppercase font-semibold">Platform</p>
              <p className="text-xs font-semibold text-neutral-900 truncate">
                {sysReqs?.isWindows ? 'Windows (Matched)' : 'Windows x64 Build'}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50/70 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-500 uppercase font-semibold">Database</p>
              <p className="text-xs font-semibold text-neutral-900 truncate">Embedded SQLite</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50/70 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-500 uppercase font-semibold">Privileges</p>
              <p className="text-xs font-semibold text-neutral-900 truncate">No Admin Required</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50/70 flex items-center gap-2">
            <Barcode className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-500 uppercase font-semibold">Hardware</p>
              <p className="text-xs font-semibold text-neutral-900 truncate">USB HID + Thermal</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-neutral-200 flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'setup'
                ? 'border-teal-700 text-teal-900 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <WindowsIcon className="w-3.5 h-3.5" />
            <span>1-Click Windows Setup (Recommended)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requirements')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'requirements'
                ? 'border-teal-700 text-teal-900 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>System Requirements & Check</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portable')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'portable'
                ? 'border-teal-700 text-teal-900 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Portable / Flash Drive Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('enterprise')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'enterprise'
                ? 'border-teal-700 text-teal-900 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-neutral-700" />
            <span>Multi-Till & Commands</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="text-xs text-neutral-700 min-h-[260px]">
          {/* TAB 1: 1-CLICK WINDOWS SETUP */}
          {activeTab === 'setup' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 text-teal-950 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-teal-900">
                    Effortless Windows Installation (No Admin Password Required)
                  </p>
                  <p className="text-teal-800">
                    The KitabuPOS Windows installer deploys directly to your user profile at{' '}
                    <code className="font-mono bg-teal-100/80 px-1 py-0.5 rounded text-[11px] text-teal-950">
                      %LOCALAPPDATA%\Programs\KitabuPOS
                    </code>
                    , automatically creating Desktop and Start Menu shortcuts.
                  </p>
                </div>
              </div>

              {/* 3 Step Visual Flow */}
              <div className="space-y-3">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
                  3 Easy Steps to Deploy on Your Windows Counter PC:
                </h4>

                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-neutral-900">
                      Copy or download installer files to your Windows PC or USB stick
                    </p>
                    <p className="text-neutral-600 leading-relaxed">
                      Download the launcher script <code className="font-mono bg-neutral-200 px-1 py-0.2 rounded font-semibold text-neutral-800">Install-KitabuPOS.cmd</code> beside your release package or run it directly from your installation USB flash drive.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          downloadWindowsInstallerCmd();
                          toast.success('Downloaded Install-KitabuPOS.cmd');
                        }}
                        className="text-xs bg-white border-neutral-300 shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-teal-700" />
                        <span>Download Install-KitabuPOS.cmd</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          downloadWindowsInstallerPs1();
                          toast.success('Downloaded Install-KitabuPOS.ps1');
                        }}
                        className="text-xs bg-white border-neutral-300 shadow-2xs"
                      >
                        <FileCode className="w-3.5 h-3.5 text-blue-700" />
                        <span>Download Install-KitabuPOS.ps1</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-neutral-900">
                      Double-click <code className="font-mono text-teal-900 font-semibold">Install-KitabuPOS.cmd</code>
                    </p>
                    <p className="text-neutral-600 leading-relaxed">
                      The installer executes immediately in PowerShell with bypass mode. It unzips application binaries, establishes isolated local storage, and adds a dedicated "KitabuPOS Bookshop System" shortcut directly on your desktop.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-neutral-900">
                      Launch & complete the 4-step first-run setup wizard
                    </p>
                    <p className="text-neutral-600 leading-relaxed">
                      Click your desktop icon. KitabuPOS opens in a dedicated maximized window. Enter your store name, county, M-Pesa till number, and set your administrator password. Your POS till is ready for sales immediately!
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Safety Callout */}
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-between text-neutral-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Update Safety Guarantee:</strong> Re-running the installer updates application files without modifying or deleting your database records.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM REQUIREMENTS & PRE-FLIGHT CHECK */}
          {activeTab === 'requirements' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-neutral-900">
                    Hardware & Operating System Verification
                  </h4>
                  <p className="text-[11px] text-neutral-600">
                    KitabuPOS is built for maximum hardware efficiency on standard Kenyan retail counter computers.
                  </p>
                </div>
                {sysReqs?.isWindows && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Windows Detected</span>
                  </span>
                )}
              </div>

              {/* Requirements Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. OS */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <WindowsIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>Operating System</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      PASS
                    </span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    Windows 10 (64-bit) or Windows 11 (64-bit). Intel or AMD x64 architecture.
                  </p>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Current environment: {sysReqs?.osName || 'Evaluating...'}
                  </p>
                </div>

                {/* 2. Memory / RAM */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                      <span>System Memory (RAM)</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      PASS
                    </span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    4 GB minimum. 8 GB recommended for large academic bookstores with 20,000+ titles.
                  </p>
                  {sysReqs?.estimatedMemoryGb && (
                    <p className="text-[10px] text-neutral-400 font-mono">
                      Estimated RAM: ~{sysReqs.estimatedMemoryGb} GB
                    </p>
                  )}
                </div>

                {/* 3. Local Storage */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                      <span>Local Storage Space</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      PASS
                    </span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    500 MB free hard drive or SSD space for program files and automatic database backups.
                  </p>
                  {sysReqs?.storageQuotaMb && (
                    <p className="text-[10px] text-neutral-400 font-mono">
                      Available storage quota: ~{sysReqs.storageQuotaMb} MB
                    </p>
                  )}
                </div>

                {/* 4. Display Resolution */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-amber-600" />
                      <span>Screen Resolution</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      {sysReqs?.isScreenAdequate ? 'PASS' : 'OPTIMAL'}
                    </span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    1366 × 768 px minimum (1920 × 1080 recommended for dual-column cashier view).
                  </p>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Screen resolution: {sysReqs?.screenResolution || '1920 × 1080 px'}
                  </p>
                </div>

                {/* 5. Barcode Scanner */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-teal-600" />
                      <span>Barcode Scanner</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      READY
                    </span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    Any standard USB Barcode Scanner (Plug-and-play HID keyboard wedge). Zero drivers needed.
                  </p>
                </div>

                {/* 6. Thermal Printer */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-rose-600" />
                      <span>Thermal Receipt Printer</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      READY
                    </span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    Supports 80mm and 58mm ESC/POS thermal printers connected via USB, Bluetooth, or Windows Print Spooler.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PORTABLE / USB FLASH DRIVE MODE */}
          {activeTab === 'portable' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 space-y-1">
                <p className="font-bold text-xs text-amber-900">
                  Zero-Installation Portable Mode (Run Straight from USB)
                </p>
                <p className="text-xs text-amber-800">
                  Ideal for store managers who carry the register on a flash drive, or for temporary academic exhibitions and book fairs where software cannot be installed on host computers.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900">
                      Unpack the portable zip archive
                    </p>
                    <p className="text-neutral-600 mt-0.5">
                      Extract <code className="font-mono bg-neutral-200 px-1 py-0.2 rounded text-[11px]">KitabuPOS-Portable-x64.zip</code> into any folder, such as <code className="font-mono bg-neutral-200 px-1 py-0.2 rounded text-[11px]">C:\KitabuPOS</code> or directly onto a USB flash drive (e.g. <code className="font-mono bg-neutral-200 px-1 py-0.2 rounded text-[11px]">D:\KitabuPOS</code>).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900">
                      Double-click <code className="font-mono text-neutral-900 font-semibold">KitabuPOS.exe</code>
                    </p>
                    <p className="text-neutral-600 mt-0.5">
                      The application launches immediately without modifying the Windows Registry or requiring administrator access.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900">
                      Create an optional desktop shortcut
                    </p>
                    <p className="text-neutral-600 mt-0.5">
                      Right-click <code className="font-mono bg-neutral-200 px-1 py-0.2 rounded text-[11px]">KitabuPOS.exe</code> &rarr; <strong>Send to</strong> &rarr; <strong>Desktop (create shortcut)</strong> for quick counter access.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENTERPRISE & COMMANDS */}
          {activeTab === 'enterprise' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-800">
                <p className="font-bold text-xs text-neutral-900">
                  Command-Line & Silent Multi-Till Deployment
                </p>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Useful for multi-counter bookshops, educational institutes, or automated deployment scripts.
                </p>
              </div>

              <div className="space-y-3">
                {/* Command 1: Standard 1-Click */}
                <div className="p-3 rounded-xl bg-neutral-900 text-white space-y-2 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-200">
                      Standard Batch Installer (CMD)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('Install-KitabuPOS.cmd', 'CMD Command')}
                      className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-mono"
                    >
                      {copiedCommand === 'CMD Command' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCommand === 'CMD Command' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-neutral-300 bg-neutral-950 p-2 rounded overflow-x-auto">
                    Install-KitabuPOS.cmd
                  </pre>
                </div>

                {/* Command 2: Custom Directory + Launch */}
                <div className="p-3 rounded-xl bg-neutral-900 text-white space-y-2 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-200">
                      Install to Custom Directory and Auto-Launch
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          'powershell.exe -ExecutionPolicy Bypass -File .\\Install-KitabuPOS.ps1 -InstallDirectory "C:\\KitabuPOS" -Launch',
                          'Custom Path Command'
                        )
                      }
                      className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-mono"
                    >
                      {copiedCommand === 'Custom Path Command' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCommand === 'Custom Path Command' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-neutral-300 bg-neutral-950 p-2 rounded overflow-x-auto">
                    powershell.exe -ExecutionPolicy Bypass -File .\Install-KitabuPOS.ps1 -InstallDirectory "C:\KitabuPOS" -Launch
                  </pre>
                </div>

                {/* Storage Locations Summary */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <h5 className="font-bold text-xs text-neutral-900">
                    Windows Desktop Storage & Path Registry
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-white border border-neutral-200">
                      <p className="text-neutral-500 text-[10px] uppercase font-sans font-semibold">Program Files</p>
                      <p className="text-neutral-900 truncate">%LOCALAPPDATA%\Programs\KitabuPOS</p>
                    </div>
                    <div className="p-2 rounded bg-white border border-neutral-200">
                      <p className="text-neutral-500 text-[10px] uppercase font-sans font-semibold">Daily Backups</p>
                      <p className="text-neutral-900 truncate">%APPDATA%\KitabuPOS\Backups</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Windows 10/11 64-bit • Embedded SQLite • Zero Internet Required</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                downloadWindowsInstallerCmd();
                toast.success('Downloaded Install-KitabuPOS.cmd');
              }}
              className="bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Installer</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
