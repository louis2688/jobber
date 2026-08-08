import { Dimension, type DisplayMode, type FisParts } from './dimension.ts'

export type EntrySegment = 'feet' | 'inches' | 'sixteenths'

/**
 * Tracks in-progress keypad entry for FIS (feet : inches : n/16)
 * and decimal modes (DEC / INCH / MET).
 *
 * FIS digit entry matches Jobber jt.js: each digit enters at the
 * sixteenths place and shifts prior values left (16ths → inches → feet).
 */
export class EntryBuffer {
  mode: DisplayMode
  /** FIS display registers (Jobber feet_disp / inches_disp / fraction_disp). */
  private feetText = '0'
  private inchesText = '0'
  private fractionText = '0'
  /** After 12–15 (or 10–11 when inches already multi-digit), further FIS digits are ignored. */
  private fracLocked = false
  /** Legacy segment cursor — unused for Jobber FIS shift entry; kept for API compat. */
  segment: EntrySegment = 'feet'
  /** True once the user has typed something in the current entry. */
  dirty = false
  /** Decimal-mode text buffer (supports multi-digit + decimal point). */
  decimalText = ''
  negative = false

  constructor(mode: DisplayMode = 'FIS') {
    this.mode = mode
  }

  /** Numeric FIS parts (for tests / callers). */
  get feet(): number {
    return Number(this.feetText) || 0
  }
  get inches(): number {
    return Number(this.inchesText) || 0
  }
  get sixteenths(): number {
    return Number(this.fractionText) || 0
  }

  reset(mode: DisplayMode = this.mode): void {
    this.mode = mode
    this.feetText = '0'
    this.inchesText = '0'
    this.fractionText = '0'
    this.fracLocked = false
    this.segment = 'feet'
    this.dirty = false
    this.decimalText = ''
    this.negative = false
  }

  setMode(mode: DisplayMode): void {
    if (mode === this.mode) return
    const dim = this.toDimension()
    this.reset(mode)
    if (!dim.isZero()) {
      this.loadFromDimension(dim)
    }
  }

  loadFromDimension(dim: Dimension): void {
    this.negative = dim.toInches() < 0
    if (this.mode === 'FIS') {
      const fis = dim.toFis()
      this.feetText = String(fis.feet)
      this.inchesText = String(fis.inches)
      this.fractionText = String(fis.sixteenths)
      this.negative = fis.negative
      this.fracLocked = false
      this.segment = 'feet'
      this.dirty = false
      this.decimalText = ''
    } else {
      const n = Math.abs(dim.asModeNumber(this.mode))
      this.decimalText = trimTrailingZeros(String(Number(n.toFixed(6))))
      this.dirty = false
    }
  }

  /**
   * Digit key 0–15.
   * - FIS: Jobber right-to-left shift into 16ths → inches → feet
   * - DEC/INCH/MET: append to decimal text buffer
   */
  inputDigit(n: number): void {
    if (n < 0 || n > 15 || !Number.isInteger(n)) return
    this.dirty = true

    if (this.mode === 'FIS') {
      this.inputFisDigit(n)
      return
    }

    this.decimalText += String(n)
  }

  /**
   * Jobber jt.js fis digit path:
   *   if (feet_disp == 0) feet_disp = ""
   *   feet_disp = feet_disp + inches_disp
   *   inches_disp = fraction_disp
   *   fraction_disp = digit
   */
  private inputFisDigit(n: number): void {
    if (this.fracLocked) return

    // Loose equality like Jobber: "0" == 0 → strip leading zero feet before append
    let feet = this.feetText
    if (Number(feet) === 0) feet = ''
    this.feetText = feet + this.inchesText
    if (this.feetText === '') this.feetText = '0'
    this.inchesText = this.fractionText
    this.fractionText = String(n)

    // Jobber frac_set: 12–15 always lock; 10–11 lock if inches already multi-digit
    if (n >= 12) {
      this.fracLocked = true
    } else if (n >= 10 && this.inchesText.length > 1) {
      this.fracLocked = true
    }
  }

  /**
   * No-op for Jobber FIS (digits shift automatically).
   * Kept so colon/arrow key does not crash; does not change registers.
   */
  advanceSegment(): void {
    if (this.mode !== 'FIS') return
    this.dirty = true
  }

  inputDecimalPoint(): void {
    if (this.mode === 'FIS') return
    this.dirty = true
    if (this.decimalText.includes('.')) return
    this.decimalText = this.decimalText === '' ? '0.' : `${this.decimalText}.`
  }

  toggleSign(): void {
    this.negative = !this.negative
    this.dirty = true
  }

  clearEntry(): void {
    this.feetText = '0'
    this.inchesText = '0'
    this.fractionText = '0'
    this.fracLocked = false
    this.segment = 'feet'
    this.decimalText = ''
    this.negative = false
    this.dirty = false
  }

  toDimension(): Dimension {
    if (this.mode === 'FIS') {
      // Jobber getCurrentFeetVal → decimal feet; we store inches via fromFis
      return Dimension.fromFis(this.feet, this.inches, this.sixteenths, this.negative)
    }
    const raw = this.decimalText === '' || this.decimalText === '.' ? 0 : Number(this.decimalText)
    const value = this.negative ? -Math.abs(raw) : raw
    return Dimension.fromMode(value, this.mode)
  }

  formatDisplay(): string {
    if (this.mode === 'FIS') {
      const sign = this.negative ? '-' : ''
      // Match Jobber display_FIS: raw register strings
      const feet = this.feetText === '' ? '0' : this.feetText
      return `${sign}${feet} ft. : ${this.inchesText} : ${this.fractionText}/16 inch`
    }
    const sign = this.negative ? '-' : ''
    const text = this.decimalText === '' ? '0' : this.decimalText
    switch (this.mode) {
      case 'DEC':
        return `${sign}${text} ft`
      case 'INCH':
        return `${sign}${text}"`
      case 'MET':
        return `${sign}${text} mm`
    }
  }

  toFisParts(): FisParts {
    return this.toDimension().toFis()
  }
}

/** Parse a FIS display string like `10 : 6 : 0/16` or `10 ft. : 6 : 0/16 inch`. */
export function parseFisString(input: string): Dimension {
  const trimmed = input
    .replace(/ft\.?/gi, '')
    .replace(/inch(?:es)?/gi, '')
    .replace(/"/g, '')
    .trim()
  const negative = trimmed.startsWith('-')
  const body = negative ? trimmed.slice(1).trim() : trimmed
  const match = body.match(/^(\d+)\s*:\s*(\d+)\s*:\s*(\d+)\s*\/\s*16$/)
  if (!match) throw new Error(`Invalid FIS string: ${input}`)
  return Dimension.fromFis(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    negative,
  )
}

function trimTrailingZeros(s: string): string {
  if (!s.includes('.')) return s
  return s.replace(/\.?0+$/, '') || '0'
}
