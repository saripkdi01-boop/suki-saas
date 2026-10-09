const WITA = 'Asia/Makassar';

/** Rp1.500.000 */
export function rp(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '-';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (Number.isNaN(num)) return '-';
  return 'Rp' + Math.round(num).toLocaleString('id-ID');
}

/** 09 Okt 2026 (WITA) */
export function tglWita(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** 09 Okt 2026 13:05 (WITA) */
export function tglJamWita(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Untuk input[type=date]: YYYY-MM-DD */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WITA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return parts; // YYYY-MM-DD
}

/** Sisa hari dari tanggal (WITA). Negatif bila lewat. */
export function sisaHari(tanggal: string | null | undefined): number | null {
  if (!tanggal) return null;
  const now = new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: WITA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  );
  const t = new Date(tanggal);
  if (Number.isNaN(t.getTime())) return null;
  return Math.round((t.getTime() - now.getTime()) / 86_400_000);
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
