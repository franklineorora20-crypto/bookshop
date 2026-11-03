import React from 'react';

export interface KitabuLogoProps {
  size?: number;
  className?: string;
  variant?: 'mark' | 'horizontal' | 'badge';
  colorMode?: 'shuka' | 'teal' | 'white' | 'black';
}

export const KitabuLogo: React.FC<KitabuLogoProps> = ({
  size = 28,
  className = '',
  variant = 'mark',
  colorMode = 'shuka',
}) => {
  // Master Shuka Cover Palette
  const COLOR_BG_RED = '#791F1F';
  const COLOR_COVER_BLUE = '#185FA5';
  const COLOR_SPINE_NAVY = '#042C53';
  const COLOR_STRIPE_RED = '#E24B4A';
  const COLOR_STRIPE_CREAM = '#FAEEDA';
  const COLOR_STRIPE_GOLD = '#EF9F27';

  // 1-Bit Thermal Receipt / Single-Color Monochrome Mark (black on white)
  if (colorMode === 'black') {
    const receiptSvg = (
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="KitabuPOS Thermal Receipt Logo"
      >
        <rect width="120" height="120" fill="#FFFFFF" />
        {/* Book outline */}
        <rect x="28" y="18" width="64" height="84" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="4.5" />
        {/* Spine */}
        <rect x="28" y="18" width="12" height="84" rx="4" fill="#000000" />
        {/* Horizontal stripes */}
        <rect x="40" y="36" width="52" height="6" fill="#000000" />
        <rect x="40" y="52" width="52" height="10" fill="#000000" />
        <rect x="40" y="72" width="52" height="6" fill="#000000" />
        {/* Vertical stripes with clean spacing */}
        <rect x="49" y="18" width="5" height="16" fill="#000000" />
        <rect x="49" y="44" width="5" height="6" fill="#000000" />
        <rect x="49" y="64" width="5" height="6" fill="#000000" />
        <rect x="49" y="80" width="5" height="22" fill="#000000" />

        <rect x="71" y="18" width="8" height="16" fill="#000000" />
        <rect x="71" y="44" width="8" height="6" fill="#000000" />
        <rect x="71" y="64" width="8" height="6" fill="#000000" />
        <rect x="71" y="80" width="8" height="22" fill="#000000" />
      </svg>
    );
    return receiptSvg;
  }

  // Master Shuka Book SVG (Book only on transparent canvas)
  const shukaBookSvg = (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="KitabuPOS Shuka Cover Logo"
    >
      <rect x="28" y="18" width="64" height="84" rx="5" fill={COLOR_COVER_BLUE} />
      <rect x="28" y="36" width="64" height="6" fill={COLOR_STRIPE_CREAM} />
      <rect x="28" y="52" width="64" height="10" fill={COLOR_STRIPE_RED} />
      <rect x="28" y="72" width="64" height="6" fill={COLOR_STRIPE_GOLD} />
      <rect x="48" y="18" width="5" height="84" fill={COLOR_STRIPE_CREAM} />
      <rect x="70" y="18" width="8" height="84" fill={COLOR_STRIPE_RED} />
      <rect x="28" y="18" width="10" height="84" rx="4" fill={COLOR_SPINE_NAVY} />
    </svg>
  );

  if (variant === 'badge') {
    // Master Icon Badge with #791F1F background and rx=28
    return (
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="KitabuPOS App Icon Badge"
      >
        <rect width="120" height="120" rx="28" fill={COLOR_BG_RED} />
        <rect x="28" y="18" width="64" height="84" rx="5" fill={COLOR_COVER_BLUE} />
        <rect x="28" y="36" width="64" height="6" fill={COLOR_STRIPE_CREAM} />
        <rect x="28" y="52" width="64" height="10" fill={COLOR_STRIPE_RED} />
        <rect x="28" y="72" width="64" height="6" fill={COLOR_STRIPE_GOLD} />
        <rect x="48" y="18" width="5" height="84" fill={COLOR_STRIPE_CREAM} />
        <rect x="70" y="18" width="8" height="84" fill={COLOR_STRIPE_RED} />
        <rect x="28" y="18" width="10" height="84" rx="4" fill={COLOR_SPINE_NAVY} />
      </svg>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        <KitabuLogo variant="badge" size={size} />
        <div className="flex flex-col text-left">
          <div className="font-extrabold tracking-tight leading-none text-neutral-900 text-lg">
            Kitabu<span className="text-[#185FA5]">POS</span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase mt-0.5">
            Bookshop Management
          </span>
        </div>
      </div>
    );
  }

  return shukaBookSvg;
};
