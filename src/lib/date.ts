export function localDateIso(value: Date = new Date()): string {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateDDMMYYYY(input: string | Date): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [yyyy, mm, dd] = input.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }

  const date = input instanceof Date ? input : new Date(input);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function normalizeToIsoDate(value?: string | null, fallback = ''): string {
  if (!value) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const dmyMatch = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return localDateIso(parsed);
  }

  return fallback || value;
}

export function normalizeToDisplayDate(value?: string | null, fallback = ''): string {
  const normalized = normalizeToIsoDate(value, fallback);
  return normalized ? formatDateDDMMYYYY(normalized) : fallback;
}
