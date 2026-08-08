/**
 * Degrees–minutes–seconds helpers for Jobber-style DMSin entry.
 *
 * Accepted entry forms (decimal display / DEC mode):
 * - `DD.MMSS`  → 45.3015 = 45° 30′ 15″
 * - `DD:MM:SS` → 45:30:15
 * - Already-decimal degrees when value has no MMSS packing (e.g. 45.5)
 */

export interface DmsParts {
  degrees: number
  minutes: number
  seconds: number
  negative: boolean
}

/** Convert DMS parts to signed decimal degrees. */
export function dmsToDecimal(parts: DmsParts): number {
  const abs =
    Math.abs(parts.degrees) +
    Math.abs(parts.minutes) / 60 +
    Math.abs(parts.seconds) / 3600
  return parts.negative ? -abs : abs
}

/** Split decimal degrees into DMS (floor deg/min; seconds float). */
export function decimalToDms(decimal: number): DmsParts {
  const negative = decimal < 0
  const abs = Math.abs(decimal)
  const degrees = Math.floor(abs)
  const minFloat = (abs - degrees) * 60
  const minutes = Math.floor(minFloat)
  const seconds = (minFloat - minutes) * 60
  return { degrees, minutes, seconds, negative }
}

export function formatDms(parts: DmsParts, secDigits = 1): string {
  const sign = parts.negative ? '-' : ''
  return `${sign}${parts.degrees}°${parts.minutes}'${parts.seconds.toFixed(secDigits)}"`
}

/** Compact D° M′ S″ with spaces (for display bar). */
export function formatDmsDisplay(parts: DmsParts, secDigits = 1): string {
  const sign = parts.negative ? '-' : ''
  return `${sign}${parts.degrees}° ${parts.minutes}′ ${parts.seconds.toFixed(secDigits)}″`
}

/** Pack decimal degrees as Jobber-style DD.MMSS (seconds truncated to int). */
export function toPackedDms(decimal: number): number {
  const parts = decimalToDms(decimal)
  const packed =
    Math.abs(parts.degrees) +
    parts.minutes / 100 +
    Math.min(59, Math.floor(parts.seconds + 1e-9)) / 10000
  return parts.negative ? -packed : packed
}

/**
 * Parse Jobber-style DMS from a numeric entry or string.
 *
 * Rules for numeric `n`:
 * - If `|n| < 360` and fractional part looks like MMSS (MM 0–59, SS 0–59.99),
 *   treat as packed DD.MMSS.
 * - Otherwise treat as decimal degrees.
 *
 * String forms: `45:30:15`, `45 30 15`, `45°30'15"`, or plain number text.
 */
export function parseDmsInput(input: number | string): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error('Invalid DMS')
    return parsePackedOrDecimal(input)
  }

  const trimmed = input.trim()
  if (!trimmed) throw new Error('Invalid DMS')

  const dmsMatch = trimmed.match(
    /^(-)?\s*(\d+(?:\.\d+)?)\s*[°:\s]\s*(\d+(?:\.\d+)?)\s*['′:\s]\s*(\d+(?:\.\d+)?)\s*["″]?$/,
  )
  if (dmsMatch) {
    const negative = Boolean(dmsMatch[1])
    const degrees = Number(dmsMatch[2])
    const minutes = Number(dmsMatch[3])
    const seconds = Number(dmsMatch[4])
    if (minutes >= 60 || seconds >= 60) throw new Error('Invalid DMS minutes/seconds')
    return dmsToDecimal({ degrees, minutes, seconds, negative })
  }

  const colon = trimmed.match(/^(-)?\s*(\d+)\s*:\s*(\d+)\s*:\s*(\d+(?:\.\d+)?)\s*$/)
  if (colon) {
    return dmsToDecimal({
      degrees: Number(colon[2]),
      minutes: Number(colon[3]),
      seconds: Number(colon[4]),
      negative: Boolean(colon[1]),
    })
  }

  const n = Number(trimmed.replace(/[^\d.+-]/g, ''))
  if (!Number.isFinite(n)) throw new Error('Invalid DMS')
  return parsePackedOrDecimal(n)
}

function parsePackedOrDecimal(n: number): number {
  const negative = n < 0
  const abs = Math.abs(n)
  const degrees = Math.floor(abs)
  const frac = abs - degrees
  if (frac < 1e-12) return negative ? -degrees : degrees

  // Pack as DD.MMSS — MM from first two decimal digits, SS from next
  const packed = Math.round(frac * 10000)
  const mm = Math.floor(packed / 100)
  const ss = packed % 100
  if (mm <= 59 && ss <= 59) {
    return dmsToDecimal({ degrees, minutes: mm, seconds: ss, negative })
  }
  // Fallback: already decimal degrees (e.g. 45.5)
  return n
}
