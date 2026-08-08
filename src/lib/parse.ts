import { Dimension, type DisplayMode, type FisParts } from './dimension.ts'

export type EntrySegment = 'feet' | 'inches' | 'sixteenths'

/**
 * Tracks in-progress keypad entry for FIS (feet : inches : n/16)
 * and decimal modes (DEC / INCH / MET).
 */
export class EntryBuffer {
  mode: DisplayMode
  /** FIS segments */
  feet = 0
  inches = 0
  sixteenths = 0
  segment: EntrySegment = 'feet'
  /** True once the user has typed something in the current entry. */
  dirty = false
  /** Decimal-mode text buffer (supports multi-digit + decimal point). */
  decimalText = ''
  negative = false

  constructor(mode: DisplayMode = 'FIS') {
    this.mode = mode
  }

  private segmentFlags = { feet: false, inches: false, sixteenths: false }

  reset(mode: DisplayMode = this.mode): void {
    this.mode = mode
    this.feet = 0
    this.inches = 0
    this.sixteenths = 0
    this.segment = 'feet'
    this.segmentFlags = { feet: false, inches: false, sixteenths: false }
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
      this.feet = fis.feet
      this.inches = fis.inches
      this.sixteenths = fis.sixteenths
      this.negative = fis.negative
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
   * - Keys 0–9: accumulate multi-digit in current FIS segment / decimal buffer
   * - Keys 10–15: set current FIS segment (or append digits in decimal modes)
   */
  inputDigit(n: number): void {
    if (n < 0 || n > 15 || !Number.isInteger(n)) return
    this.dirty = true

    if (this.mode === 'FIS') {
      this.inputFisDigit(n)
      return
    }

    if (n >= 10) {
      // Two-digit key in decimal modes
      this.decimalText += String(n)
    } else {
      this.decimalText += String(n)
    }
  }

  private inputFisDigit(n: number): void {
    if (n >= 10) {
      // Direct set for 10–15 (Jobber-style single key)
      this.setSegment(n)
      return
    }

    const current = this.getSegment()
    // Fresh segment start: replace; otherwise accumulate (cap reasonable)
    if (!this.segmentStarted()) {
      this.setSegment(n)
      this.markSegmentStarted()
      return
    }

    const next = current * 10 + n
    const max = this.segment === 'feet' ? 9999 : this.segment === 'inches' ? 15 : 15
    this.setSegment(Math.min(next, max))
  }

  private segmentStarted(): boolean {
    return this.segmentFlags[this.segment]
  }

  private markSegmentStarted(): void {
    this.segmentFlags[this.segment] = true
  }

  /** Advance FIS segment: feet → inches → sixteenths (wrap stays on last). */
  advanceSegment(): void {
    if (this.mode !== 'FIS') return
    this.dirty = true
    if (this.segment === 'feet') this.segment = 'inches'
    else if (this.segment === 'inches') this.segment = 'sixteenths'
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

  private getSegment(): number {
    switch (this.segment) {
      case 'feet':
        return this.feet
      case 'inches':
        return this.inches
      case 'sixteenths':
        return this.sixteenths
    }
  }

  private setSegment(n: number): void {
    switch (this.segment) {
      case 'feet':
        this.feet = n
        break
      case 'inches':
        this.inches = Math.min(n, 15)
        break
      case 'sixteenths':
        this.sixteenths = Math.min(n, 15)
        break
    }
    this.segmentFlags[this.segment] = true
  }

  clearEntry(): void {
    this.feet = 0
    this.inches = 0
    this.sixteenths = 0
    this.segment = 'feet'
    this.segmentFlags = { feet: false, inches: false, sixteenths: false }
    this.decimalText = ''
    this.negative = false
    this.dirty = false
  }

  toDimension(): Dimension {
    if (this.mode === 'FIS') {
      return Dimension.fromFis(this.feet, this.inches, this.sixteenths, this.negative)
    }
    const raw = this.decimalText === '' || this.decimalText === '.' ? 0 : Number(this.decimalText)
    const value = this.negative ? -Math.abs(raw) : raw
    return Dimension.fromMode(value, this.mode)
  }

  formatDisplay(): string {
    if (this.mode === 'FIS') {
      const sign = this.negative ? '-' : ''
      return `${sign}${this.feet} : ${this.inches} : ${this.sixteenths}/16`
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

/** Parse a FIS display string like `10 : 6 : 0/16` or `-1 : 2 : 8/16`. */
export function parseFisString(input: string): Dimension {
  const trimmed = input.trim()
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
