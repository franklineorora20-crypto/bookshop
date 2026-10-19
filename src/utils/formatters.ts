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

export function getTodayNairobiDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
