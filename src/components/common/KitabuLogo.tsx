import React from 'react';

export interface KitabuLogoProps {
  size?: number;
  className?: string;
  variant?: 'mark' | 'horizontal' | 'badge';
  colorMode?: 'teal' | 'white' | 'black';
}

export const KitabuLogo: React.FC<KitabuLogoProps> = ({
  size = 28,
  className = '',
  variant = 'mark',
  colorMode = 'teal',
}) => {
  const PRIMARY_TEAL = '#0F4C5C';
  const ACCENT_TEAL = '#1A9A8E';
  const TASSEL_GOLD = '#F2E8C6';
  const TEXT_DARK = '#121F33';

  let b1Color = PRIMARY_TEAL;
  let b2Color = PRIMARY_TEAL;
  let b3Color = ACCENT_TEAL;
  let b4Color = PRIMARY_TEAL;
  let tasselColor = TASSEL_GOLD;
  let pagesColor = '#FFFFFF';

  if (colorMode === 'black') {
    b1Color = '#121F33';
    b2Color = '#121F33';
    b3Color = '#121F33';
    b4Color = '#121F33';
    tasselColor = '#121F33';
    pagesColor = '#FFFFFF';
  } else if (colorMode === 'white') {
    b1Color = '#FFFFFF';
    b2Color = '#FFFFFF';
    b3Color = '#FFFFFF';
    b4Color = '#FFFFFF';
    tasselColor = TASSEL_GOLD;
    pagesColor = '#0F4C5C';
  }

  const markSvg = (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="KitabuPOS Logo"
    >
      <g id="kitabu-k-mark">
        {/* Book 1: Top vertical spine of K */}
        <g id="book-1">
          <rect x="144" y="96" width="56" height="150" rx="8" fill={b1Color} />
          <rect x="188" y="102" width="6" height="138" rx="2" fill={pagesColor} fillOpacity="0.4" />
          <path
            d="M144 116 C124 122, 118 136, 122 152"
            stroke={tasselColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="122" cy="152" r="4.5" fill={tasselColor} />
        </g>

        {/* Book 2: Bottom vertical spine of K */}
        <g id="book-2">
          <rect x="144" y="266" width="56" height="150" rx="8" fill={b2Color} />
          <rect x="188" y="272" width="6" height="138" rx="2" fill={pagesColor} fillOpacity="0.4" />
          <path
            d="M144 380 C124 374, 118 360, 122 344"
            stroke={tasselColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="122" cy="344" r="4.5" fill={tasselColor} />
        </g>

        {/* Book 3: Upper diagonal stroke of K */}
        <g id="book-3" transform="translate(196, 240) rotate(-40)">
          <rect x="0" y="-28" width="186" height="56" rx="8" fill={b3Color} />
          <rect x="8" y="18" width="170" height="6" rx="2" fill={pagesColor} fillOpacity="0.4" />
          <path
            d="M186 0 C206 -4, 214 -16, 210 -30"
            stroke={tasselColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="210" cy="-30" r="4.5" fill={tasselColor} />
        </g>

        {/* Book 4: Lower diagonal stroke of K */}
        <g id="book-4" transform="translate(202, 272) rotate(40)">
          <rect x="0" y="-28" width="186" height="56" rx="8" fill={b4Color} />
          <rect x="8" y="-24" width="170" height="6" rx="2" fill={pagesColor} fillOpacity="0.4" />
          <path
            d="M186 0 C206 4, 214 16, 210 30"
            stroke={tasselColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="210" cy="30" r="4.5" fill={tasselColor} />
        </g>
      </g>
    </svg>
  );

  if (variant === 'badge') {
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: PRIMARY_TEAL,
        }}
        className={`rounded-xl flex items-center justify-center shrink-0 shadow-xs ${className}`}
      >
        <KitabuLogo size={Math.round(size * 0.72)} colorMode="white" />
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        <div
          style={{ width: size, height: size, backgroundColor: PRIMARY_TEAL }}
          className="rounded-xl flex items-center justify-center shrink-0 shadow-xs"
        >
          <KitabuLogo size={Math.round(size * 0.72)} colorMode="white" />
        </div>
        <div className="flex flex-col text-left">
          <div className="font-extrabold tracking-tight leading-none text-neutral-900 text-lg">
            Kitabu<span style={{ color: ACCENT_TEAL }}>POS</span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase mt-0.5">
            Bookshop Management
          </span>
        </div>
      </div>
    );
  }

  return markSvg;
};
