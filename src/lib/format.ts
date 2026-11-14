const DAY = 86_400_000
const HOUR = 3_600_000

export function fmtCoord(lat: number, lon: number): string {
  const ns = lat < 0 ? 'S' : 'N'
  const ew = lon < 0 ? 'W' : 'E'
  return `${Math.abs(lat).toFixed(2)}°${ns} · ${Math.abs(lon).toFixed(2)}°${ew}`
}

export function fmtElevation(m: number): string {
  const v = Math.round(m)
  return `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-US')} m`
}

export function fmtKm(m: number): string {
  return `${(m / 1000).toFixed(2)} km`
}

export function fmtPct(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return '—'
  return `${v.toFixed(digits)}%`
}

export function fmtHours(hours: number | null): string {
  if (hours === null) return 'No event in window'
  if (hours <= 0.001) return '0 h'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 48) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} d`
}

export function fmtDurationMs(ms: number): string {
  return fmtHours(ms / HOUR)
}

export function fmtDateUtc(ms: number, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
    ...opts,
  }).format(new Date(ms))
}

export function fmtDateTimeUtc(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(ms))
}

export function fmtDayUtc(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(ms))
}

export function fmtMonthUtc(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(ms))
}

export function fmtTimeUtc(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(ms))
}

export function addDays(ms: number, days: number): number {
  return ms + days * DAY
}

export function toDateInputValue(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function fromDateInputValue(value: string, hour = 12): string {
  return `${value}T${String(hour).padStart(2, '0')}:00:00.000Z`
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function signed(v: number, digits = 1): string {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`
}

export function formatHoursShort(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(0)}h`
  return `${(hours / 24).toFixed(hours < 240 ? 1 : 0)}d`
}
