import { Dimension } from './dimension.ts'

/** Pitch is inches of rise per 12 inches of run (e.g. 6 = 6/12). */
export interface TriangleState {
  rise: Dimension | null
  run: Dimension | null
  /** Pitch as rise-per-12 (unitless inches-of-rise). */
  pitch: number | null
  slope: Dimension | null
  deg: number | null
  areaSqIn: number | null
}

export type TriangleField = 'rise' | 'run' | 'pitch' | 'slope' | 'deg'

const EPS = 1e-9

export function emptyTriangle(): TriangleState {
  return {
    rise: null,
    run: null,
    pitch: null,
    slope: null,
    deg: null,
    areaSqIn: null,
  }
}

function hypot(a: number, b: number): number {
  return Math.sqrt(a * a + b * b)
}

/**
 * Solve a right triangle from any two of: rise, run, pitch, slope, deg.
 * Pitch is construction pitch (rise per 12" of run).
 * All linear values are Dimension (inches internally).
 */
export function solveTriangle(
  input: Partial<{
    rise: Dimension
    run: Dimension
    pitch: number
    slope: Dimension
    deg: number
  }>,
): TriangleState {
  let rise = input.rise?.toInches() ?? null
  let run = input.run?.toInches() ?? null
  let pitch = input.pitch ?? null
  let slope = input.slope?.toInches() ?? null
  let deg = input.deg ?? null

  // Derive pitch ↔ deg when one angle-like value is present
  if (pitch != null && deg == null) {
    deg = (Math.atan(pitch / 12) * 180) / Math.PI
  } else if (deg != null && pitch == null) {
    pitch = 12 * Math.tan((deg * Math.PI) / 180)
  }

  // Count known linear / ratio constraints and fill missing
  for (let i = 0; i < 4; i++) {
    // rise + run
    if (rise != null && run != null) {
      slope = hypot(rise, run)
      pitch = run === 0 ? null : (rise / run) * 12
      deg = run === 0 ? (rise >= 0 ? 90 : -90) : (Math.atan(rise / run) * 180) / Math.PI
      break
    }

    // rise + slope
    if (rise != null && slope != null) {
      if (Math.abs(slope) + EPS < Math.abs(rise)) {
        throw new Error('Slope must be ≥ |rise|')
      }
      run = Math.sqrt(slope * slope - rise * rise)
      pitch = run === 0 ? null : (rise / run) * 12
      deg = run === 0 ? 90 : (Math.atan(rise / run) * 180) / Math.PI
      break
    }

    // run + slope
    if (run != null && slope != null) {
      if (Math.abs(slope) + EPS < Math.abs(run)) {
        throw new Error('Slope must be ≥ |run|')
      }
      rise = Math.sqrt(slope * slope - run * run)
      pitch = run === 0 ? null : (rise / run) * 12
      deg = run === 0 ? 90 : (Math.atan(rise / run) * 180) / Math.PI
      break
    }

    // rise + pitch (or deg→pitch)
    if (rise != null && pitch != null) {
      if (Math.abs(pitch) < EPS) {
        run = Infinity
      } else {
        run = (rise * 12) / pitch
      }
      if (!Number.isFinite(run)) throw new Error('Invalid pitch for rise')
      slope = hypot(rise, run)
      deg = (Math.atan(pitch / 12) * 180) / Math.PI
      break
    }

    // run + pitch
    if (run != null && pitch != null) {
      rise = (pitch / 12) * run
      slope = hypot(rise, run)
      deg = (Math.atan(pitch / 12) * 180) / Math.PI
      break
    }

    // slope + pitch
    if (slope != null && pitch != null) {
      const r = pitch / 12
      run = slope / Math.sqrt(r * r + 1)
      rise = r * run
      deg = (Math.atan(r) * 180) / Math.PI
      break
    }

    // rise + deg
    if (rise != null && deg != null) {
      const rad = (deg * Math.PI) / 180
      if (Math.abs(Math.cos(rad)) < EPS) throw new Error('Invalid angle')
      run = rise / Math.tan(rad)
      slope = hypot(rise, run)
      pitch = 12 * Math.tan(rad)
      break
    }

    // run + deg
    if (run != null && deg != null) {
      const rad = (deg * Math.PI) / 180
      rise = run * Math.tan(rad)
      slope = hypot(rise, run)
      pitch = 12 * Math.tan(rad)
      break
    }

    // slope + deg
    if (slope != null && deg != null) {
      const rad = (deg * Math.PI) / 180
      rise = slope * Math.sin(rad)
      run = slope * Math.cos(rad)
      pitch = 12 * Math.tan(rad)
      break
    }

    break
  }

  const areaSqIn =
    rise != null && run != null && Number.isFinite(rise) && Number.isFinite(run)
      ? (Math.abs(rise) * Math.abs(run)) / 2
      : null

  return {
    rise: rise != null && Number.isFinite(rise) ? Dimension.fromInches(rise) : null,
    run: run != null && Number.isFinite(run) ? Dimension.fromInches(run) : null,
    pitch: pitch != null && Number.isFinite(pitch) ? pitch : null,
    slope: slope != null && Number.isFinite(slope) ? Dimension.fromInches(slope) : null,
    deg: deg != null && Number.isFinite(deg) ? deg : null,
    areaSqIn,
  }
}

export function formatPitch(pitch: number | null): string {
  if (pitch == null) return '—'
  const rounded = Number(pitch.toFixed(4))
  return `${rounded}/12`
}

export function formatDeg(deg: number | null): string {
  if (deg == null) return '—'
  return `${Number(deg.toFixed(2))}°`
}

export function formatArea(areaSqIn: number | null, mode: 'sqin' | 'sqft' = 'sqft'): string {
  if (areaSqIn == null) return '—'
  if (mode === 'sqin') return `${Number(areaSqIn.toFixed(2))} in²`
  const sqft = areaSqIn / 144
  return `${Number(sqft.toFixed(4))} ft²`
}
