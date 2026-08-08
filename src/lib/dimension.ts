/** Display / entry unit modes for the construction calculator. */
export type DisplayMode = 'FIS' | 'DEC' | 'INCH' | 'MET'

export interface FisParts {
  negative: boolean
  feet: number
  inches: number
  sixteenths: number
}

const SIXTEENTH = 1 / 16
const MM_PER_INCH = 25.4

function roundToSixteenthInches(inches: number): number {
  return Math.round(inches / SIXTEENTH) * SIXTEENTH
}

/**
 * Dimension stores length as decimal inches.
 * Format / convert to FIS, decimal feet, inches, or millimeters.
 */
export class Dimension {
  private readonly inches: number

  private constructor(inches: number) {
    this.inches = Number.isFinite(inches) ? inches : 0
  }

  static zero(): Dimension {
    return new Dimension(0)
  }

  static fromInches(inches: number): Dimension {
    return new Dimension(inches)
  }

  static fromFeet(feet: number): Dimension {
    return new Dimension(feet * 12)
  }

  static fromMm(mm: number): Dimension {
    return new Dimension(mm / MM_PER_INCH)
  }

  static fromFis(feet: number, inches: number, sixteenths: number, negative = false): Dimension {
    const total =
      Math.abs(feet) * 12 + Math.abs(inches) + Math.abs(sixteenths) * SIXTEENTH
    return new Dimension(negative ? -total : total)
  }

  static fromMode(value: number, mode: DisplayMode): Dimension {
    switch (mode) {
      case 'FIS':
      case 'DEC':
        return Dimension.fromFeet(value)
      case 'INCH':
        return Dimension.fromInches(value)
      case 'MET':
        return Dimension.fromMm(value)
    }
  }

  toInches(): number {
    return this.inches
  }

  toFeet(): number {
    return this.inches / 12
  }

  toMm(): number {
    return this.inches * MM_PER_INCH
  }

  isZero(): boolean {
    return Math.abs(this.inches) < 1e-12
  }

  negate(): Dimension {
    return new Dimension(-this.inches)
  }

  abs(): Dimension {
    return new Dimension(Math.abs(this.inches))
  }

  add(other: Dimension): Dimension {
    return new Dimension(this.inches + other.inches)
  }

  subtract(other: Dimension): Dimension {
    return new Dimension(this.inches - other.inches)
  }

  /** Scalar multiply (dimensionless). */
  multiply(factor: number): Dimension {
    return new Dimension(this.inches * factor)
  }

  /** Scalar divide (dimensionless). */
  divide(factor: number): Dimension {
    if (factor === 0) throw new Error('Division by zero')
    return new Dimension(this.inches / factor)
  }

  /** Divide two lengths → unitless ratio. */
  ratio(other: Dimension): number {
    if (other.isZero()) throw new Error('Division by zero')
    return this.inches / other.inches
  }

  toFis(): FisParts {
    const negative = this.inches < 0
    let remaining = roundToSixteenthInches(Math.abs(this.inches))
    // Carry floating dust into whole inches after sixteenth rounding
    remaining = Math.round(remaining / SIXTEENTH) * SIXTEENTH

    let feet = Math.floor(remaining / 12)
    remaining -= feet * 12
    let wholeInches = Math.floor(remaining + 1e-9)
    remaining -= wholeInches
    let sixteenths = Math.round(remaining / SIXTEENTH)

    if (sixteenths === 16) {
      sixteenths = 0
      wholeInches += 1
    }
    if (wholeInches >= 12) {
      feet += Math.floor(wholeInches / 12)
      wholeInches %= 12
    }

    return { negative, feet, inches: wholeInches, sixteenths }
  }

  format(mode: DisplayMode, precision = 4): string {
    switch (mode) {
      case 'FIS': {
        const { negative, feet, inches, sixteenths } = this.toFis()
        const sign = negative ? '-' : ''
        return `${sign}${feet} ft. : ${inches} : ${sixteenths}/16 inch`
      }
      case 'DEC': {
        const v = this.toFeet()
        const rounded = Number(v.toFixed(precision))
        return `${rounded} ft`
      }
      case 'INCH': {
        const rounded = roundToSixteenthInches(this.inches)
        const whole = Math.trunc(rounded)
        const frac = Math.round((Math.abs(rounded) - Math.abs(whole)) / SIXTEENTH)
        const sign = rounded < 0 ? '-' : ''
        if (frac === 0) return `${sign}${Math.abs(whole)}"`
        return `${sign}${Math.abs(whole)} ${frac}/16"`
      }
      case 'MET': {
        const mm = this.toMm()
        const rounded = Number(mm.toFixed(2))
        return `${rounded} mm`
      }
    }
  }

  /** Numeric value for the active mode (for DEC/INCH/MET entry & export). */
  asModeNumber(mode: DisplayMode): number {
    switch (mode) {
      case 'FIS':
      case 'DEC':
        return this.toFeet()
      case 'INCH':
        return this.toInches()
      case 'MET':
        return this.toMm()
    }
  }
}
