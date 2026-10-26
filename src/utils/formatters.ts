export function formatKES(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'KES 0.00';
  }
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('Ksh', 'KES');
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-KE').format(num);
}

export function formatDateTime(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return '—';
  try {
    const date = new Date(isoOrDateString);
    if (isNaN(date.getTime())) return isoOrDateString;
    return new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoOrDateString;
  }
}

export function formatDate(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return '—';
  try {
    const date = new Date(isoOrDateString);
    if (isNaN(date.getTime())) return isoOrDateString;
    return new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoOrDateString;
  }
}

export function getNairobiDateString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function getTodayNairobiDateString(): string {
  return getNairobiDateString(new Date());
}

export function getYesterdayNairobiDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getNairobiDateString(d);
}
