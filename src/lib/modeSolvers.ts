import { Dimension } from './dimension.ts'
import type { DisplayMode } from './dimension.ts'
import {
  decimalToDms,
  formatDms,
  formatDmsDisplay,
  parseDmsInput,
  toPackedDms,
} from './dms.ts'
import type { CalcProgram, FnKeyId } from './programs.ts'
import { FN_LABELS } from './programs.ts'
import {
  emptyTriangle,
  solveTriangle,
  type TriangleState,
} from './triangle.ts'

export interface ModeResult {
  value?: Dimension
  forceDec?: boolean
  /** TECHNICAL %: treat as pending binary op (x × y/100), Jobber setpercent */
  setPercent?: boolean
  tape: string
  /** Optional D°M′S″ annotation for the display bar */
  dmsDisplay?: string
  triangle?: TriangleState
  clearTriangle?: boolean
  /** Updated triangle inputs when in triangle mode */
  triangleInputs?: Partial<{
    rise: Dimension
    run: Dimension
    pitch: number
    slope: Dimension
    deg: number
  }>
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180
}

function rad2deg(r: number): number {
  return (r * 180) / Math.PI
}

function numFromDim(dim: Dimension, mode: DisplayMode): number {
  if (mode === 'DEC' || mode === 'FIS') return dim.toFeet()
  if (mode === 'INCH') return dim.toInches()
  return dim.toMm()
}

function dimFromModeNumber(n: number, mode: DisplayMode): Dimension {
  if (mode === 'INCH') return Dimension.fromInches(n)
  if (mode === 'MET') return Dimension.fromMm(n)
  return Dimension.fromFeet(n)
}

export class ModeBags {
  circle: {
    radius: Dimension | null
    diameter: Dimension | null
    deg: number | null
    cord: Dimension | null
    /** Middle ordinate (segment height). */
    mo: Dimension | null
    /** Inside ordinate (apothem). */
    io: Dimension | null
    arc: Dimension | null
    cir: Dimension | null
    areaSqIn: number | null
    spac: Dimension | null
    /** Jobber SEG: arm segmented-rise stepper; + advances. */
    rakeSet: boolean
    rakeMode: 'up' | 'down'
    rakeRemainderIn: number
    rake: Dimension | null
  } = {
    radius: null,
    diameter: null,
    deg: null,
    cord: null,
    mo: null,
    io: null,
    arc: null,
    cir: null,
    areaSqIn: null,
    spac: null,
    rakeSet: false,
    rakeMode: 'down',
    rakeRemainderIn: 0,
    rake: null,
  }

  stairs: {
    riserH: Dimension | null
    trdWth: Dimension | null
    flfl: Dimension | null
    steps: number | null
    run: Dimension | null
    nose: Dimension | null
  } = {
    riserH: null,
    trdWth: null,
    flfl: null,
    steps: null,
    run: null,
    nose: null,
  }

  oblique: {
    a: Dimension | null
    b: Dimension | null
    c: Dimension | null
    A: number | null
    B: number | null
    C: number | null
    /** Second solution angle B when SSA is ambiguous */
    ambiguousB: number | null
  } = { a: null, b: null, c: null, A: null, B: null, C: null, ambiguousB: null }

  roof: {
    /**
     * Construction pitch as rise-per-12 (UX: enter 6 for 6/12).
     * Jobber jt.js stores rise/run ratio; atan(p/12) matches atan(ratio).
     */
    pitch: number | null
    /** Second pitch for irregular hip (rise per 12). */
    pitch2: number | null
    rise: Dimension | null
    run: Dimension | null
    slope: Dimension | null
    deg: number | null
    spac: Dimension | null
    /**
     * Which pitch drives Rk-Up/Dn:
     * 1 = primary (pitch), 2 = secondary (pitch2 / irregular).
     */
    jackSide: 1 | 2
    /** Jobber Rk-Up/Dn: arm then + advances plumb rise. */
    rakeSet: boolean
    rakeMode: 'up' | 'down'
    rakeRemainderIn: number
    rake: Dimension | null
    /** HIP key cycle: 0=tan, 1=angle, 2=length (Jobber showHip). */
    hipShow: number
    hipPitch: number | null
    hipDeg: number | null
    hipLength: Dimension | null
  } = {
    pitch: null,
    pitch2: null,
    rise: null,
    run: null,
    slope: null,
    deg: null,
    spac: null,
    jackSide: 1,
    rakeSet: false,
    rakeMode: 'up',
    rakeRemainderIn: 0,
    rake: null,
    hipShow: 0,
    hipPitch: null,
    hipDeg: null,
    hipLength: null,
  }

  /** TECHNICAL: next SINE/COS is inverse (Jobber toggles after each press). */
  techInvSin = false
  techInvCos = false

  clear(program: CalcProgram): void {
    if (program === 'technical') {
      this.techInvSin = false
      this.techInvCos = false
    }
    if (program === 'circle') {
      this.circle = {
        radius: null,
        diameter: null,
        deg: null,
        cord: null,
        mo: null,
        io: null,
        arc: null,
        cir: null,
        areaSqIn: null,
        spac: null,
        rakeSet: false,
        rakeMode: 'down',
        rakeRemainderIn: 0,
        rake: null,
      }
    } else if (program === 'stairs') {
      this.stairs = {
        riserH: null,
        trdWth: null,
        flfl: null,
        steps: null,
        run: null,
        nose: null,
      }
    } else if (program === 'oblique') {
      this.oblique = {
        a: null,
        b: null,
        c: null,
        A: null,
        B: null,
        C: null,
        ambiguousB: null,
      }
    } else if (program === 'roof') {
      this.roof = {
        pitch: null,
        pitch2: null,
        rise: null,
        run: null,
        slope: null,
        deg: null,
        spac: null,
        jackSide: 1,
        rakeSet: false,
        rakeMode: 'up',
        rakeRemainderIn: 0,
        rake: null,
        hipShow: 0,
        hipPitch: null,
        hipDeg: null,
        hipLength: null,
      }
    }
  }
}

export function handleProgramKey(
  program: CalcProgram,
  key: FnKeyId,
  current: Dimension,
  mode: DisplayMode,
  bags: ModeBags,
  triangleInputs: Partial<{
    rise: Dimension
    run: Dimension
    pitch: number
    slope: Dimension
    deg: number
  }>,
): ModeResult {
  const label = FN_LABELS[key][program]

  switch (program) {
    case 'triangle':
      return handleTriangle(key, current, mode, triangleInputs)
    case 'circle':
      return handleCircle(key, current, mode, bags, label)
    case 'stairs':
      return handleStairs(key, current, mode, bags, label)
    case 'oblique':
      return handleOblique(key, current, mode, bags, label)
    case 'technical':
      return handleTechnical(key, current, mode, bags, label)
    case 'roof':
      return handleRoof(key, current, mode, bags, label)
  }
}

function handleTriangle(
  key: FnKeyId,
  current: Dimension,
  mode: DisplayMode,
  inputs: Partial<{
    rise: Dimension
    run: Dimension
    pitch: number
    slope: Dimension
    deg: number
  }>,
): ModeResult {
  if (key === 'help') return { tape: 'Help' }
  if (key === 'clrtr') {
    return { tape: 'ClrTR', clearTriangle: true, triangle: emptyTriangle(), triangleInputs: {} }
  }
  if (key === 'retr') return { tape: 'ReTR' }
  if (key === 'dmsin') {
    const dec = parseDmsInput(numFromDim(current, mode))
    const parts = decimalToDms(dec)
    const next = { ...inputs, deg: dec }
    const t = solveTriangle(next)
    return {
      value: Dimension.fromFeet(dec),
      forceDec: true,
      dmsDisplay: formatDmsDisplay(parts),
      tape: `DMSin ${formatDms(parts)} → ${dec.toFixed(4)}° (packed ${toPackedDms(dec).toFixed(4)})`,
      triangle: t,
      triangleInputs: next,
    }
  }

  const fieldMap: Record<string, 'rise' | 'run' | 'pitch' | 'slope' | 'deg' | 'area'> = {
    pitch: 'pitch',
    deg: 'deg',
    rise: 'rise',
    area: 'area',
    run: 'run',
    slp: 'slope',
  }
  const field = fieldMap[key]
  if (!field) return { tape: key }

  if (field === 'area') {
    const t = solveTriangle(inputs)
    if (t.areaSqIn == null) throw new Error('Need rise & run')
    const sqft = t.areaSqIn / 144
    return {
      value: Dimension.fromFeet(sqft),
      tape: `Area ${sqft.toFixed(4)} ft2`,
      triangle: t,
    }
  }

  const next = { ...inputs }
  if (field === 'pitch') {
    const raw = Math.abs(numFromDim(current, mode))
    // Jobber stores rise/run; we keep n/12 UX — ratio <1 → ×12
    next.pitch = raw > 0 && raw < 1 ? raw * 12 : raw
  } else if (field === 'deg') next.deg = numFromDim(current, mode)
  else next[field] = current

  const t = solveTriangle(next)

  if (field === 'pitch' && t.pitch != null) {
    return {
      value: Dimension.fromFeet(t.pitch),
      forceDec: true,
      tape: `pitch ${t.pitch.toFixed(4)}/12`,
      triangle: t,
      triangleInputs: next,
    }
  }
  if (field === 'deg' && t.deg != null) {
    const parts = decimalToDms(t.deg)
    return {
      value: Dimension.fromFeet(t.deg),
      forceDec: true,
      dmsDisplay: formatDmsDisplay(parts),
      tape: `deg ${t.deg.toFixed(4)}° = ${formatDms(parts)}`,
      triangle: t,
      triangleInputs: next,
    }
  }

  let out = current
  if (field === 'rise' && t.rise) out = t.rise
  if (field === 'run' && t.run) out = t.run
  if (field === 'slope' && t.slope) out = t.slope

  return {
    value: out,
    tape: `${field} <- ${current.format(mode)}`,
    triangle: t,
    triangleInputs: next,
  }
}

function ensureCircleRadius(c: ModeBags['circle']): number | null {
  if (c.radius) return c.radius.toInches()
  if (c.diameter) return c.diameter.toInches() / 2
  return null
}

/** Sync Jobber circle derived fields (mo/io/arc/cir/area) when possible. */
function refreshCircle(c: ModeBags['circle']): void {
  let r = ensureCircleRadius(c)
  if (r != null && r > 0) {
    c.radius = Dimension.fromInches(r)
    c.diameter = Dimension.fromInches(r * 2)
    c.cir = Dimension.fromInches(2 * Math.PI * r)
    c.areaSqIn = Math.PI * r * r
  }
  if (r != null && c.deg != null) {
    const half = deg2rad(Math.abs(c.deg)) / 2
    c.io = Dimension.fromInches(r * Math.cos(half))
    c.mo = Dimension.fromInches(r - c.io.toInches())
    c.cord = Dimension.fromInches(2 * r * Math.sin(half))
    if (c.cir) {
      c.arc = Dimension.fromInches(c.cir.toInches() * (Math.abs(c.deg) / 360))
    }
    return
  }
  if (r != null && c.cord) {
    const half = c.cord.toInches() / 2
    if (half > r + 1e-9) return
    const io = Math.sqrt(Math.max(0, r * r - half * half))
    if (io <= 0 || Math.abs(io - r) < 1e-12) return
    c.io = Dimension.fromInches(io)
    c.mo = Dimension.fromInches(r - io)
    c.deg = rad2deg(2 * Math.atan(half / io))
    if (c.cir) {
      c.arc = Dimension.fromInches(c.cir.toInches() * (Math.abs(c.deg) / 360))
    }
    return
  }
  if (r != null && c.mo) {
    const mo = c.mo.toInches()
    if (mo <= 0 || mo > 2 * r) return
    const io = r - mo
    c.io = Dimension.fromInches(io)
    if (io <= 0) return
    c.cord = Dimension.fromInches(2 * Math.sqrt(Math.max(0, r * r - io * io)))
    const half = c.cord.toInches() / 2
    c.deg = rad2deg(2 * Math.atan(half / io))
    if (c.cir) {
      c.arc = Dimension.fromInches(c.cir.toInches() * (Math.abs(c.deg) / 360))
    }
  }
  if (r != null && c.arc && c.cir) {
    c.deg = (c.arc.toInches() / c.cir.toInches()) * 360
    const half = deg2rad(Math.abs(c.deg)) / 2
    c.io = Dimension.fromInches(r * Math.cos(half))
    c.mo = Dimension.fromInches(r - c.io.toInches())
    c.cord = Dimension.fromInches(2 * r * Math.sin(half))
  }
}

/**
 * Jobber circle SEG/+ segmented rise (jt.js plus + circle.rake_Set).
 * Mode is always armed "down" by SEG; Spac sets step; + advances.
 */
function advanceCircleSeg(c: ModeBags['circle'], mode: DisplayMode): ModeResult {
  const r = ensureCircleRadius(c)
  if (r == null || r <= 0) throw new Error('Need RAD/Diam for SEG')
  if (!c.spac || c.spac.toInches() <= 0) throw new Error('Need Spac for SEG')
  refreshCircle(c)
  const i = c.io?.toInches()
  const cord = c.cord?.toInches()
  if (i == null || cord == null || !(i > 0)) {
    throw new Error('Need Cord or DEG so SEG can step')
  }
  const s = c.spac.toInches()
  const a = cord * 0.5
  const x = c.rakeRemainderIn + s
  let h: number
  if (c.rakeMode === 'up') {
    // h = √(r² − (√(r²−i²) − x)²) − i
    const halfChord = Math.sqrt(Math.max(0, r * r - i * i))
    h = Math.sqrt(Math.max(0, r * r - (halfChord - x) ** 2)) - i
  } else {
    // Jobber down (SEG default): h = √(r² − (√(r²−i²) − (a − x))²) − i
    const halfChord = Math.sqrt(Math.max(0, r * r - i * i))
    h = Math.sqrt(Math.max(0, r * r - (halfChord - (a - x)) ** 2)) - i
  }
  c.rakeRemainderIn = x
  if (!Number.isFinite(h)) {
    c.rake = Dimension.zero()
    return { value: Dimension.zero(), tape: 'SEG rise 0 (past segment)' }
  }
  c.rake = Dimension.fromInches(h)
  return {
    value: c.rake,
    tape: `SEG rise ${c.rake.format(mode)} (x ${Dimension.fromInches(x).format(mode)})`,
  }
}

function handleCircle(
  key: FnKeyId,
  current: Dimension,
  mode: DisplayMode,
  bags: ModeBags,
  label: string,
): ModeResult {
  const c = bags.circle

  if (key === 'clrtr') {
    if (current.toInches() <= 0) throw new Error('Spac must be > 0')
    c.spac = current
    // Jobber: if rake not armed, also seed space used by stepper
    return { value: current, tape: `Spac <- ${current.format(mode)}` }
  }
  if (key === 'pitch') {
    if (current.toInches() <= 0) throw new Error('RAD must be > 0')
    c.radius = current
    c.diameter = Dimension.fromInches(current.toInches() * 2)
    refreshCircle(c)
    return { value: current, tape: `RAD <- ${current.format(mode)}` }
  }
  if (key === 'rise') {
    if (current.toInches() <= 0) throw new Error('Diam must be > 0')
    c.diameter = current
    c.radius = Dimension.fromInches(current.toInches() / 2)
    refreshCircle(c)
    return { value: current, tape: `Diam <- ${current.format(mode)}` }
  }
  if (key === 'deg') {
    c.deg = numFromDim(current, mode)
    if (Math.abs(c.deg) > 360) throw new Error('DEG must be ≤ 360')
    refreshCircle(c)
    return {
      value: Dimension.fromFeet(c.deg),
      forceDec: true,
      tape: `DEG <- ${c.deg.toFixed(2)}`,
    }
  }
  if (key === 'run') {
    c.cord = current
    refreshCircle(c)
    return { value: current, tape: `Cord <- ${current.format(mode)}` }
  }
  if (key === 'slp') {
    // Jobber SEG: arm segmented-rise stepper (rake_mode=down); + advances
    refreshCircle(c)
    c.rakeSet = true
    bags.roof.rakeSet = false
    c.rakeMode = 'down'
    c.rakeRemainderIn = 0
    c.rake = Dimension.zero()
    const mo = c.mo ?? Dimension.zero()
    return {
      value: mo,
      tape: `SEG armed (M.O. ${mo.format(mode)}; set Spac then +)`,
    }
  }

  // Circ / Area / ARC inverses (Jobber number_set false paths)
  if (key === 'help') {
    // Circ: input → radius = C/(2π); else display circumference
    if (!current.isZero() && ensureCircleRadius(c) == null) {
      const circ = current.toInches()
      if (circ <= 0) throw new Error('Circ must be > 0')
      const r = circ / (2 * Math.PI)
      c.cir = current
      c.radius = Dimension.fromInches(r)
      c.diameter = Dimension.fromInches(r * 2)
      refreshCircle(c)
      return {
        value: c.radius,
        tape: `Circ <- ${current.format(mode)} → RAD ${c.radius.format(mode)}`,
      }
    }
    const r = ensureCircleRadius(c)
    if (r == null) throw new Error('Enter RAD, Diam, or Circ first')
    refreshCircle(c)
    const circ = c.cir ?? Dimension.fromInches(2 * Math.PI * r)
    return {
      value: circ,
      tape: `Circ ${circ.format(mode)}`,
    }
  }

  if (key === 'area') {
    // Area input → radius (jobberh.js documents inverse; jt.js display path)
    if (!current.isZero() && ensureCircleRadius(c) == null) {
      let areaSqIn: number
      if (mode === 'MET') {
        areaSqIn = Math.abs(current.toMm()) ** 2 / (25.4 ** 2)
      } else if (mode === 'INCH') {
        areaSqIn = Math.abs(current.toInches())
      } else {
        // DEC/FIS: Jobber area is sq ft
        areaSqIn = Math.abs(current.toFeet()) * 144
      }
      if (areaSqIn <= 0) throw new Error('Area must be > 0')
      const r = Math.sqrt(areaSqIn / Math.PI)
      c.areaSqIn = areaSqIn
      c.radius = Dimension.fromInches(r)
      c.diameter = Dimension.fromInches(r * 2)
      refreshCircle(c)
      return {
        value: c.radius,
        tape: `Area <- → RAD ${c.radius.format(mode)}`,
      }
    }
    const r = ensureCircleRadius(c)
    if (r == null) throw new Error('Enter RAD or Diam first')
    refreshCircle(c)
    if (c.deg != null && Math.abs(c.deg) < 360 - 1e-9) {
      const theta = deg2rad(Math.abs(c.deg))
      const a = 0.5 * r * r * (theta - Math.sin(theta))
      const sqft = a / 144
      return {
        value: Dimension.fromFeet(sqft),
        forceDec: true,
        tape: `SegArea ${sqft.toFixed(4)} ft2`,
      }
    }
    const sqft = (Math.PI * r * r) / 144
    return {
      value: Dimension.fromFeet(sqft),
      forceDec: true,
      tape: `Area ${sqft.toFixed(4)} ft2`,
    }
  }

  if (key === 'retr') {
    // ARC input (Jobber) or display
    if (!current.isZero()) {
      c.arc = current
      const r0 = ensureCircleRadius(c)
      if (r0 != null && r0 > 0) {
        c.cir = Dimension.fromInches(2 * Math.PI * r0)
        c.deg = (c.arc.toInches() / c.cir.toInches()) * 360
        refreshCircle(c)
        return {
          value: c.arc,
          tape: `ARC <- ${current.format(mode)} (DEG ${c.deg!.toFixed(2)})`,
        }
      }
      if (c.cord) {
        // Jobber solve_CordArc iterative angle search
        const cord = c.cord.toInches()
        const arcLen = c.arc.toInches()
        if (cord <= 0 || arcLen <= 0) throw new Error('Cord/ARC must be > 0')
        let ang = 4
        let incr = 4
        const arc2crd = arcLen / cord
        for (let ct = 0; ct < 75; ct++) {
          const angratio = ang / (2 * Math.sin(ang / 2))
          if (angratio > arc2crd) {
            incr /= 2
            ang -= incr
          } else {
            incr *= 2
            ang += incr
          }
        }
        const rr = cord / 2 / Math.sin(ang / 2)
        c.radius = Dimension.fromInches(rr)
        c.diameter = Dimension.fromInches(rr * 2)
        c.deg = rad2deg(ang)
        refreshCircle(c)
        return {
          value: c.radius,
          tape: `ARC+Cord → RAD ${c.radius.format(mode)} (DEG ${c.deg!.toFixed(2)})`,
        }
      }
      return { value: current, tape: `ARC <- ${current.format(mode)}` }
    }
    const r = ensureCircleRadius(c)
    if (r == null) throw new Error('Enter RAD or Diam first')
    refreshCircle(c)
    const deg = c.deg ?? 360
    const arc = c.arc ?? Dimension.fromInches(r * deg2rad(deg))
    return {
      value: arc,
      tape: `ARC ${arc.format(mode)}`,
    }
  }

  if (key === 'dmsin') {
    // M.O. input or display
    if (!current.isZero()) {
      c.mo = current
      refreshCircle(c)
      return { value: current, tape: `M.O. <- ${current.format(mode)}` }
    }
    const r = ensureCircleRadius(c)
    if (r == null) throw new Error('Enter RAD or Diam first')
    refreshCircle(c)
    if (c.mo) {
      return {
        value: c.mo,
        tape: `M.O. ${c.mo.format(mode)}`,
      }
    }
    if (c.cord) {
      const half = c.cord.toInches() / 2
      if (half > r + 1e-9) throw new Error('Cord > diameter')
      if (half > r) {
        return { value: Dimension.zero(), tape: 'M.O. 0 (cord = diameter)' }
      }
      const mo = r - Math.sqrt(Math.max(0, r * r - half * half))
      c.mo = Dimension.fromInches(mo)
      return {
        value: c.mo,
        tape: `M.O. ${c.mo.format(mode)}`,
      }
    }
    return { value: Dimension.fromInches(r), tape: 'M.O. (enter Cord or DEG)' }
  }

  return { value: current, tape: label }
}

function solveStairs(s: ModeBags['stairs']): void {
  const riser = s.riserH?.toInches() ?? null
  const tread = s.trdWth?.toInches() ?? null
  let flfl = s.flfl?.toInches() ?? null
  let steps = s.steps
  let run = s.run?.toInches() ?? null

  if (riser != null && riser <= 0) throw new Error('riserH must be > 0')
  if (tread != null && tread <= 0) throw new Error('trdWth must be > 0')
  if (flfl != null && flfl <= 0) throw new Error('FL-FL must be > 0')
  if (steps != null && (!Number.isFinite(steps) || steps < 1)) {
    throw new Error('steps must be ≥ 1')
  }
  if (steps != null && steps > 200) throw new Error('steps too large (max 200)')
  if (run != null && run < 0) throw new Error('Run must be ≥ 0')

  if (flfl != null && riser != null && steps == null) {
    if (riser > flfl + 1e-9) throw new Error('riserH > FL-FL')
    // Jobber jt.js stair_rise: ceil any fractional rise/riser (via toFixed(1) + dec>0)
    const ratio = flfl / riser
    const whole = Math.floor(ratio + 1e-9)
    const frac = ratio - whole
    steps = Math.max(1, frac > 1e-9 ? whole + 1 : whole)
    s.steps = steps
    // Actual riser from step count (Jobber: rise / num_steps)
    s.riserH = Dimension.fromInches(flfl / steps)
  }
  if (flfl != null && steps != null && riser == null) {
    s.riserH = Dimension.fromInches(flfl / steps)
  }
  if (riser != null && steps != null && flfl == null) {
    s.flfl = Dimension.fromInches(riser * steps)
  }
  // Reconcile: if FL-FL + steps + riser conflict, prefer FL-FL/steps
  if (flfl != null && steps != null && s.riserH != null) {
    const expected = flfl / steps
    if (Math.abs(s.riserH.toInches() - expected) > 1e-6) {
      s.riserH = Dimension.fromInches(expected)
    }
  }
  // Total run spans (steps - 1) treads for a typical straight stair
  if (tread != null && steps != null && run == null) {
    const treads = Math.max(steps - 1, 0)
    s.run = Dimension.fromInches(tread * treads)
  }
  if (run != null && steps != null && steps > 1 && tread == null) {
    s.trdWth = Dimension.fromInches(run / (steps - 1))
  }
  // Single-riser / platform: run stays 0 when steps === 1
  if (steps === 1 && run == null) {
    s.run = Dimension.zero()
  }
  // steps === 1 with a positive run is unusual — keep run but do not invent tread
  if (steps === 1 && run != null && run > 0 && tread == null) {
    // leave tread unset
  }
}

function handleStairs(
  key: FnKeyId,
  current: Dimension,
  mode: DisplayMode,
  bags: ModeBags,
  label: string,
): ModeResult {
  const s = bags.stairs

  if (key === 'pitch') {
    if (current.toInches() <= 0) throw new Error('riserH must be > 0')
    s.riserH = current
    solveStairs(s)
    return { value: current, tape: `riserH <- ${current.format(mode)}` }
  }
  if (key === 'deg') {
    if (current.toInches() <= 0) throw new Error('trdWth must be > 0')
    s.trdWth = current
    solveStairs(s)
    return { value: current, tape: `trdWth <- ${current.format(mode)}` }
  }
  if (key === 'rise') {
    if (current.toInches() <= 0) throw new Error('FL-FL must be > 0')
    s.flfl = current
    solveStairs(s)
    const out = s.flfl ?? current
    return { value: out, tape: `FL-FL <- ${out.format(mode)}` }
  }
  if (key === 'area') {
    s.steps = Math.max(1, Math.round(Math.abs(numFromDim(current, mode))))
    if (s.steps < 1) throw new Error('steps must be ≥ 1')
    solveStairs(s)
    return {
      value: Dimension.fromFeet(s.steps),
      forceDec: true,
      tape: `steps <- ${s.steps}`,
    }
  }
  if (key === 'run') {
    s.run = current
    solveStairs(s)
    return { value: current, tape: `Run <- ${current.format(mode)}` }
  }
  if (key === 'help') {
    // Jobber "nose": nose-to-nose length of a single step = √(riser²+tread²)
    solveStairs(s)
    const rise = s.riserH?.toInches()
    const tread = s.trdWth?.toInches()
    if (rise == null || tread == null) throw new Error('Need riserH & trdWth')
    const n2n = Math.hypot(rise, tread)
    s.nose = Dimension.fromInches(n2n)
    return {
      value: s.nose,
      tape: `nose ${s.nose.format(mode)} (√riser²+trd²)`,
    }
  }
  if (key === 'clrtr') {
    solveStairs(s)
    // Jobber 1st step ≈ riser (plus FIS remainder trim); we show unit riser
    const v = s.riserH ?? current
    const tread = s.trdWth
    const stepsNote =
      s.steps != null
        ? `; ${s.steps} risers / ${Math.max(0, s.steps - 1)} treads`
        : ''
    const treadNote = tread != null ? `; tread ${tread.format(mode)}` : ''
    return {
      value: v,
      tape: `1stStp ${v.format(mode)}${stepsNote}${treadNote}`,
    }
  }
  if (key === 'slp') {
    solveStairs(s)
    // Jobber stringer = √(riser²+tread²)×(steps−1) — not √(FL-FL²+Run²)
    const rise = s.riserH?.toInches()
    const tread = s.trdWth?.toInches()
    const steps = s.steps
    if (rise == null || tread == null || steps == null) {
      throw new Error('Need riserH, trdWth & steps')
    }
    if (steps === 1) {
      return {
        value: Dimension.zero(),
        tape: `stringr 0 (platform / single riser)`,
      }
    }
    const unit = Math.hypot(rise, tread)
    const str = unit * (steps - 1)
    const ang = rad2deg(Math.atan(rise / tread))
    const headNote =
      ang > 42 ? ` ⚠ steep ${ang.toFixed(1)}° — check headroom` : ''
    return {
      value: Dimension.fromInches(str),
      tape: `stringr ${Dimension.fromInches(str).format(mode)}${headNote}`,
    }
  }
  if (key === 'dmsin') {
    solveStairs(s)
    const rise = s.riserH?.toInches()
    const tread = s.trdWth?.toInches()
    if (rise == null || tread == null) throw new Error('Need riserH & trdWth')
    // Jobber pitch = riser/tread (ratio); we display construction rise-per-12
    const pitch = (rise / tread) * 12
    return {
      value: Dimension.fromFeet(pitch),
      forceDec: true,
      tape: `pitch ${pitch.toFixed(4)}/12`,
    }
  }
  if (key === 'retr') {
    solveStairs(s)
    const rise = s.riserH?.toInches()
    const tread = s.trdWth?.toInches()
    if (rise == null || tread == null) throw new Error('Need riserH & trdWth')
    const ang = rad2deg(Math.atan(rise / tread))
    const parts = decimalToDms(ang)
    return {
      value: Dimension.fromFeet(ang),
      forceDec: true,
      dmsDisplay: formatDmsDisplay(parts),
      tape: `angle ${ang.toFixed(2)}° = ${formatDms(parts)}`,
    }
  }

  return { value: current, tape: label }
}

function solveOblique(o: ModeBags['oblique']): void {
  o.ambiguousB = null

  if (o.A != null && o.B != null && o.C == null) {
    const c = 180 - o.A - o.B
    if (c <= 0) throw new Error('Angles sum ≥ 180°')
    o.C = c
  }
  if (o.A != null && o.C != null && o.B == null) {
    const b = 180 - o.A - o.C
    if (b <= 0) throw new Error('Angles sum ≥ 180°')
    o.B = b
  }
  if (o.B != null && o.C != null && o.A == null) {
    const a = 180 - o.B - o.C
    if (a <= 0) throw new Error('Angles sum ≥ 180°')
    o.A = a
  }

  let a = o.a?.toInches() ?? null
  let b = o.b?.toInches() ?? null
  let c = o.c?.toInches() ?? null
  let A = o.A
  let B = o.B
  let C = o.C

  // SSS
  if (a != null && b != null && c != null) {
    if (a + b <= c || a + c <= b || b + c <= a) throw new Error('Triangle inequality')
    A = rad2deg(Math.acos(Math.min(1, Math.max(-1, (b * b + c * c - a * a) / (2 * b * c)))))
    B = rad2deg(Math.acos(Math.min(1, Math.max(-1, (a * a + c * c - b * b) / (2 * a * c)))))
    C = 180 - A - B
    o.A = A
    o.B = B
    o.C = C
    return
  }

  // SAS: a, b, C → c (law of cosines for side + angles; asin would flip obtuse A)
  if (a != null && b != null && C != null && c == null) {
    c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(deg2rad(C)))
    o.c = Dimension.fromInches(c)
    A = rad2deg(
      Math.acos(Math.min(1, Math.max(-1, (b * b + c * c - a * a) / (2 * b * c)))),
    )
    B = 180 - C - A
    o.A = A
    o.B = B
    return
  }

  // ASA / AAS via law of sines when A + side a known
  if (A != null && a != null) {
    const sinA = Math.sin(deg2rad(A))
    if (Math.abs(sinA) < 1e-12) throw new Error('Invalid angle A')

    // SSA: A, a, b — ambiguous case
    if (B == null && C == null && b != null) {
      const sinBRaw = (b * sinA) / a
      if (sinBRaw > 1 + 1e-9) throw new Error('No triangle (SSA)')
      const sinBc = Math.min(1, sinBRaw)
      const B1 = rad2deg(Math.asin(sinBc))
      const B2 = 180 - B1
      const C1 = 180 - A - B1
      const C2 = 180 - A - B2
      // Prefer acute / valid first solution
      if (C1 > 0) {
        o.B = B1
        o.C = C1
        if (C2 > 0 && Math.abs(B2 - B1) > 1e-6) o.ambiguousB = B2
      } else if (C2 > 0) {
        o.B = B2
        o.C = C2
      } else {
        throw new Error('No triangle (SSA)')
      }
      B = o.B
      C = o.C
      if (C != null) {
        c = (a * Math.sin(deg2rad(C))) / sinA
        o.c = Dimension.fromInches(c)
      }
      return
    }

    if (B != null && b == null) {
      b = (a * Math.sin(deg2rad(B))) / sinA
      o.b = Dimension.fromInches(b)
    }
    if (C != null && c == null) {
      c = (a * Math.sin(deg2rad(C))) / sinA
      o.c = Dimension.fromInches(c)
    }
  }
}

function handleOblique(
  key: FnKeyId,
  current: Dimension,
  mode: DisplayMode,
  bags: ModeBags,
  label: string,
): ModeResult {
  const o = bags.oblique
  const n = numFromDim(current, mode)

  if (key === 'pitch') {
    if (current.toInches() <= 0) throw new Error('Side must be > 0')
    o.a = current
    solveOblique(o)
    return { value: o.a, tape: `a side <- ${current.format(mode)}` }
  }
  if (key === 'rise') {
    if (current.toInches() <= 0) throw new Error('Side must be > 0')
    o.b = current
    solveOblique(o)
    return { value: o.b, tape: `b side <- ${current.format(mode)}` }
  }
  if (key === 'run') {
    if (current.toInches() <= 0) throw new Error('Side must be > 0')
    o.c = current
    solveOblique(o)
    return { value: o.c, tape: `c side <- ${current.format(mode)}` }
  }
  if (key === 'deg') {
    o.A = n
    solveOblique(o)
    const amb = o.ambiguousB != null ? ` (amb B=${o.ambiguousB.toFixed(1)})` : ''
    return {
      value: Dimension.fromFeet(o.A),
      forceDec: true,
      tape: `A deg <- ${o.A}${amb}`,
    }
  }
  if (key === 'area') {
    o.B = n
    solveOblique(o)
    return { value: Dimension.fromFeet(o.B!), forceDec: true, tape: `B deg <- ${o.B}` }
  }
  if (key === 'slp') {
    o.C = n
    solveOblique(o)
    return { value: Dimension.fromFeet(o.C!), forceDec: true, tape: `C deg <- ${o.C}` }
  }
  if (key === 'dmsin') {
    solveOblique(o)
    const a = o.a?.toInches()
    const b = o.b?.toInches()
    const C = o.C
    let area: number | null = null
    if (a != null && b != null && C != null) {
      area = 0.5 * a * b * Math.sin(deg2rad(C))
    } else if (o.a && o.b && o.c) {
      const aa = o.a.toInches()
      const bb = o.b.toInches()
      const cc = o.c.toInches()
      const s = (aa + bb + cc) / 2
      area = Math.sqrt(Math.max(0, s * (s - aa) * (s - bb) * (s - cc)))
    }
    if (area == null) throw new Error('Need sides/angles for Area')
    const sqft = area / 144
    return { value: Dimension.fromFeet(sqft), tape: `Area ${sqft.toFixed(4)} ft2` }
  }
  if (key === 'retr') {
    if (o.A == null) throw new Error('Need A deg')
    const parts = decimalToDms(o.A)
    return {
      value: Dimension.fromFeet(o.A),
      forceDec: true,
      dmsDisplay: formatDmsDisplay(parts),
      tape: `DMS ${formatDms(parts)} (packed ${toPackedDms(o.A).toFixed(4)})`,
    }
  }
  if (key === 'help' || key === 'clrtr') {
    bags.clear('oblique')
    return { tape: '… clear oblique', value: Dimension.zero() }
  }

  return { value: current, tape: label }
}

function handleTechnical(
  key: FnKeyId,
  current: Dimension,
  mode: DisplayMode,
  bags: ModeBags,
  label: string,
): ModeResult {
  const n = numFromDim(current, mode)

  if (key === 'pitch') {
    // Jobber: empty/0 toggles Inv. SINE; value computes sin or asin then toggles
    if (n === 0) {
      bags.techInvSin = !bags.techInvSin
      return {
        value: Dimension.zero(),
        forceDec: true,
        tape: bags.techInvSin ? 'Inv. SINE mode' : 'SINE mode',
      }
    }
    if (bags.techInvSin) {
      if (Math.abs(n) > 1) throw new Error('asin domain |x|≤1')
      const v = rad2deg(Math.asin(n))
      bags.techInvSin = false
      return {
        value: Dimension.fromFeet(v),
        forceDec: true,
        tape: `asin(${n})=${v.toFixed(4)}°`,
      }
    }
    const v = Math.sin(deg2rad(n))
    bags.techInvSin = true
    return { value: Dimension.fromFeet(v), forceDec: true, tape: `SIN(${n})=${v.toFixed(6)}` }
  }
  if (key === 'deg') {
    if (n === 0) {
      bags.techInvCos = !bags.techInvCos
      return {
        value: Dimension.zero(),
        forceDec: true,
        tape: bags.techInvCos ? 'Inv. COS mode' : 'COS mode',
      }
    }
    if (bags.techInvCos) {
      if (Math.abs(n) > 1) throw new Error('acos domain |x|≤1')
      const v = rad2deg(Math.acos(n))
      bags.techInvCos = false
      return {
        value: Dimension.fromFeet(v),
        forceDec: true,
        tape: `acos(${n})=${v.toFixed(4)}°`,
      }
    }
    const v = Math.cos(deg2rad(n))
    bags.techInvCos = true
    return { value: Dimension.fromFeet(v), forceDec: true, tape: `COS(${n})=${v.toFixed(6)}` }
  }
  if (key === 'rise') {
    // Jobber setpercent: pending binary op x × (y/100)
    return {
      value: current,
      setPercent: true,
      tape: `${current.format(mode)} %`,
    }
  }
  if (key === 'area') {
    if (n === 0) throw new Error('Divide by zero')
    const v = 1 / n
    return { value: Dimension.fromFeet(v), forceDec: true, tape: `1/X ${v}` }
  }
  if (key === 'run') {
    const v = n * n
    return { value: dimFromModeNumber(v, mode), tape: `X² ${v}` }
  }
  if (key === 'slp') {
    if (n < 0) throw new Error('√ of negative')
    const v = Math.sqrt(n)
    return { value: dimFromModeNumber(v, mode), tape: `√ ${v}` }
  }
  if (key === 'dmsin') {
    const dec = parseDmsInput(n)
    const parts = decimalToDms(dec)
    return {
      value: Dimension.fromFeet(dec),
      forceDec: true,
      dmsDisplay: formatDmsDisplay(parts),
      tape: `DMSin ${formatDms(parts)} → ${dec.toFixed(4)}° (packed ${toPackedDms(dec).toFixed(4)})`,
    }
  }
  if (key === 'retr') {
    const cuYd = n / 27
    return { value: Dimension.fromFeet(cuYd), forceDec: true, tape: `CuYd ${cuYd.toFixed(4)}` }
  }
  if (key === 'help') {
    return { value: Dimension.fromFeet(Math.PI), forceDec: true, tape: `π ${Math.PI}` }
  }
  if (key === 'clrtr') {
    const sqYd = n / 9
    return { value: Dimension.fromFeet(sqYd), forceDec: true, tape: `SqYd ${sqYd.toFixed(4)}` }
  }

  return { value: current, tape: label }
}

/**
 * Roof helpers aligned with Jobber jt.js:
 * - Regular HIP = √(common² + run²) = √(rise² + 2·run²) (square plan)
 * - Irregular HIP/VALLEY: pitch + pitch2 + run → √(run²+run2²+rise²)
 * - HIP key cycles hip tan → angle → length (Jobber showHip)
 * - Rk-Up / Rk-Dn arm rake_Set; + advances plumb = tan(deg)×remainder
 * - Pitch UX: enter n for n/12 (construction); Jobber stores rise/run ratio
 *   (math equivalent via atan(p/12)). Triangle pitch auto-flows to roof.
 */
function irregularPlan(r: ModeBags['roof']): {
  run1: number
  rise: number
  run2: number
  hipVal: number
  common2: number
} | null {
  if (r.pitch == null || r.pitch2 == null || r.run == null) return null
  if (r.pitch2 === 0) throw new Error('pitch2 must be > 0')
  const run1 = r.run.toInches()
  const rise = (r.pitch / 12) * run1
  const run2 = (rise * 12) / r.pitch2
  const hipVal = Math.sqrt(run1 * run1 + run2 * run2 + rise * rise)
  const common2 = Math.hypot(run2, rise)
  return { run1, rise, run2, hipVal, common2 }
}

function ensureRoofCommon(r: ModeBags['roof']): Dimension | null {
  if (r.slope) return r.slope
  if (r.pitch != null && r.run != null) {
    const rise = (r.pitch / 12) * r.run.toInches()
    r.rise = Dimension.fromInches(rise)
    r.slope = Dimension.fromInches(Math.hypot(rise, r.run.toInches()))
    return r.slope
  }
  if (r.rise != null && r.run != null) {
    r.slope = Dimension.fromInches(Math.hypot(r.rise.toInches(), r.run.toInches()))
    return r.slope
  }
  return null
}

function activeRoofPitch(r: ModeBags['roof']): number | null {
  if (r.jackSide === 2 && r.pitch2 != null) return r.pitch2
  return r.pitch
}

function syncRoofFromPitch(r: ModeBags['roof']): void {
  const p = activeRoofPitch(r)
  if (p == null) return
  r.deg = rad2deg(Math.atan(p / 12))
  if (r.run != null && r.rise == null) {
    r.rise = Dimension.fromInches((p / 12) * r.run.toInches())
  }
  if (r.rise != null && r.run != null) {
    const rise = r.rise.toInches()
    const run = r.run.toInches()
    r.slope = Dimension.fromInches(Math.hypot(rise, run))
  } else if (r.pitch != null && r.slope != null && r.run == null && r.rise == null) {
    const factor = Math.sqrt(1 + (r.pitch / 12) ** 2)
    const run = r.slope.toInches() / factor
    r.run = Dimension.fromInches(run)
    r.rise = Dimension.fromInches((r.pitch / 12) * run)
  }
}

function computeHipFields(r: ModeBags['roof']): void {
  const irr = irregularPlan(r)
  if (irr) {
    r.rise = Dimension.fromInches(irr.rise)
    r.hipLength = Dimension.fromInches(irr.hipVal)
    const rn = Math.sqrt(Math.max(0, irr.hipVal * irr.hipVal - irr.rise * irr.rise))
    r.hipPitch = rn > 0 ? irr.rise / rn : null // Jobber ratio (not /12)
    r.hipDeg = r.hipPitch != null ? rad2deg(Math.atan(r.hipPitch)) : null
    return
  }
  ensureRoofCommon(r)
  if (!r.slope || !r.run || !r.rise) return
  const hip = Math.sqrt(r.slope.toInches() ** 2 + r.run.toInches() ** 2)
  r.hipLength = Dimension.fromInches(hip)
  const rise = r.rise.toInches()
  const rn = Math.sqrt(Math.max(0, hip * hip - rise * rise))
  r.hipPitch = rn > 0 ? rise / rn : null
  r.hipDeg = r.hipPitch != null ? rad2deg(Math.atan(r.hipPitch)) : null
}

/** Jobber roof Rk-Up/Dn + : plumb rise = tan(deg) × horizontal remainder. */
function advanceRoofRake(r: ModeBags['roof'], mode: DisplayMode): ModeResult {
  if (!r.spac || r.spac.toInches() <= 0) throw new Error('Need Spac for Rk')
  const p = activeRoofPitch(r)
  if (p == null) throw new Error('Need pitch for Rk')
  const deg = rad2deg(Math.atan(p / 12))
  const spac = r.spac.toInches()
  const riseMax = r.rise?.toInches() ?? null

  if (r.rakeMode === 'up') {
    r.rakeRemainderIn += spac
    let rake = Math.tan(deg2rad(deg)) * r.rakeRemainderIn
    if (riseMax != null && rake >= riseMax) {
      rake = riseMax
      r.rakeSet = false
    }
    r.rake = Dimension.fromInches(rake)
  } else {
    r.rakeRemainderIn -= spac
    let rake = Math.tan(deg2rad(deg)) * r.rakeRemainderIn
    if (rake <= 0) {
      rake = 0
      r.rakeSet = false
    }
    r.rake = Dimension.fromInches(rake)
  }
  const side = r.jackSide === 2 ? ' side2' : ''
  return {
    value: r.rake!,
    tape: `Rk-${r.rakeMode === 'up' ? 'Up' : 'Dn'}${side} ${r.rake!.format(mode)}`,
  }
}

/**
 * When + is pressed and a Jobber rake/SEG stepper is armed, advance it
 * instead of doing arithmetic (jt.js plus handler).
 */
export function tryAdvancePlusStepper(
  program: CalcProgram,
  bags: ModeBags,
  mode: DisplayMode,
): ModeResult | null {
  if (program === 'circle' && bags.circle.rakeSet) {
    return advanceCircleSeg(bags.circle, mode)
  }
  if ((program === 'roof' || program === 'triangle') && bags.roof.rakeSet) {
    return advanceRoofRake(bags.roof, mode)
  }
  return null
}

function handleRoof(
  key: FnKeyId,
  current: Dimension,
  mode: DisplayMode,
  bags: ModeBags,
  label: string,
): ModeResult {
  const r = bags.roof

  if (key === 'area') {
    bags.clear('roof')
    return { tape: 'ClrTR', value: Dimension.zero() }
  }
  if (key === 'clrtr') {
    if (current.toInches() <= 0) throw new Error('Spac must be > 0')
    r.spac = current
    return { value: current, tape: `Spac <- ${current.format(mode)}` }
  }
  if (key === 'pitch') {
    const p = Math.abs(numFromDim(current, mode))
    if (p === 0) throw new Error('pitch must be > 0')
    // Accept Jobber ratio (<1) or construction n/12 (>=1): store as n/12
    const asPer12 = p < 1 ? p * 12 : p
    if (r.pitch != null && Math.abs(r.pitch - asPer12) > 1e-9) {
      r.pitch2 = asPer12
      r.jackSide = 1
      syncRoofFromPitch(r)
      return {
        value: Dimension.fromFeet(asPer12),
        forceDec: true,
        tape: `pitch2 ${asPer12}/12 (irreg: pitch ${r.pitch}/12 + pitch2 — then Run → HIP)`,
      }
    }
    if (r.pitch != null && Math.abs(r.pitch - asPer12) <= 1e-9 && r.pitch2 != null) {
      r.pitch = asPer12
      syncRoofFromPitch(r)
      return {
        value: Dimension.fromFeet(asPer12),
        forceDec: true,
        tape: `pitch ${asPer12}/12 (kept pitch2 ${r.pitch2}/12)`,
      }
    }
    r.pitch = asPer12
    syncRoofFromPitch(r)
    return {
      value: Dimension.fromFeet(r.pitch),
      forceDec: true,
      tape: `pitch ${r.pitch}/12`,
    }
  }
  if (key === 'deg') {
    const raw = numFromDim(current, mode)
    if (r.pitch2 != null && r.pitch != null && current.isZero()) {
      r.jackSide = r.jackSide === 1 ? 2 : 1
      const p = r.jackSide === 2 ? r.pitch2 : r.pitch
      return {
        value: Dimension.fromFeet(p),
        forceDec: true,
        tape: `jack side ${r.jackSide} (pitch ${p}/12) — Rk-Up/Rk-Dn then +`,
      }
    }
    r.deg = Math.abs(raw) < 360 ? parseDmsInput(raw) : raw
    r.pitch = 12 * Math.tan(deg2rad(r.deg))
    const parts = decimalToDms(r.deg)
    return {
      value: Dimension.fromFeet(r.deg),
      forceDec: true,
      dmsDisplay: formatDmsDisplay(parts),
      tape: `DEG ${r.deg.toFixed(4)}° = ${formatDms(parts)}`,
    }
  }
  if (key === 'rise') r.rise = current
  else if (key === 'run') {
    if (current.toInches() <= 0) throw new Error('Run must be > 0')
    r.run = current
  } else if (key === 'slp') r.slope = current

  if (r.pitch != null && r.run != null && r.rise == null) {
    r.rise = Dimension.fromInches((r.pitch / 12) * r.run.toInches())
  }
  if (r.rise != null && r.run != null) {
    const rise = r.rise.toInches()
    const run = r.run.toInches()
    r.slope = Dimension.fromInches(Math.hypot(rise, run))
    r.pitch = run === 0 ? r.pitch : (rise / run) * 12
    r.deg = run === 0 ? 90 : rad2deg(Math.atan(rise / run))
  }
  if (r.pitch != null && r.slope != null && r.run == null && r.rise == null) {
    const factor = Math.sqrt(1 + (r.pitch / 12) ** 2)
    const run = r.slope.toInches() / factor
    r.run = Dimension.fromInches(run)
    r.rise = Dimension.fromInches((r.pitch / 12) * run)
  }

  if (key === 'help') {
    // Jobber HIP cycles: tan → angle → length
    computeHipFields(r)
    if (r.hipShow > 2) r.hipShow = 0
    const step = r.hipShow
    r.hipShow = (r.hipShow + 1) % 3
    if (step === 0) {
      if (r.hipPitch == null) throw new Error('Need pitch+run (or Rise/Run) for HIP')
      return {
        value: Dimension.fromFeet(r.hipPitch),
        forceDec: true,
        tape: `hip tan: ${r.hipPitch.toFixed(6)} (ratio)`,
      }
    }
    if (step === 1) {
      if (r.hipDeg == null) throw new Error('Need pitch+run for hip angle')
      const parts = decimalToDms(r.hipDeg)
      return {
        value: Dimension.fromFeet(r.hipDeg),
        forceDec: true,
        dmsDisplay: formatDmsDisplay(parts),
        tape: `hip angle: ${r.hipDeg.toFixed(4)}°`,
      }
    }
    if (r.hipLength == null) throw new Error('Need Rise/Run or Pitch+Run for hip length')
    const irr = irregularPlan(r)
    if (irr) {
      return {
        value: r.hipLength,
        tape: `hip length: ${r.hipLength.format(mode)} (irr p ${r.pitch}/12·p2 ${r.pitch2}/12; run2 ${Dimension.fromInches(irr.run2).format(mode)})`,
      }
    }
    return {
      value: r.hipLength,
      tape: `hip length: ${r.hipLength.format(mode)}`,
    }
  }

  if (key === 'rise' && r.rise) {
    const irr = irregularPlan(r)
    if (irr) {
      return {
        value: Dimension.fromInches(irr.run2),
        tape: `Rise ${r.rise.format(mode)}; run2 ${Dimension.fromInches(irr.run2).format(mode)} (pitch2)`,
      }
    }
    return { value: r.rise, tape: `Rise <- ${current.format(mode)}` }
  }

  if (key === 'slp' && r.slope) {
    const irr = irregularPlan(r)
    if (irr) {
      return {
        value: r.slope,
        tape: `SLP ${r.slope.format(mode)}; SLP2 ${Dimension.fromInches(irr.common2).format(mode)}`,
      }
    }
    return { value: r.slope, tape: `SLP ${r.slope.format(mode)}` }
  }

  if (key === 'dmsin') {
    // Jobber Rk-Up: arm up, remainder=0, show 0; then + advances
    if (activeRoofPitch(r) == null) throw new Error('Need pitch for Rk-Up')
    if (!r.spac) throw new Error('Need Spac for Rk-Up')
    syncRoofFromPitch(r)
    r.rakeSet = true
    bags.circle.rakeSet = false
    r.rakeMode = 'up'
    r.rakeRemainderIn = 0
    r.rake = Dimension.zero()
    return {
      value: Dimension.zero(),
      tape: 'Rk-Up armed (tap + for each rise)',
    }
  }

  if (key === 'retr') {
    // Jobber Rk-Dn: arm down, remainder=run, show rise; then + advances
    syncRoofFromPitch(r)
    if (activeRoofPitch(r) == null) throw new Error('Need pitch for Rk-Dn')
    if (!r.spac) throw new Error('Need Spac for Rk-Dn')
    if (!r.run || !r.rise) throw new Error('Need Run & Rise for Rk-Dn')
    r.rakeSet = true
    bags.circle.rakeSet = false
    r.rakeMode = 'down'
    r.rakeRemainderIn = r.run.toInches()
    r.rake = r.rise
    return {
      value: r.rake,
      tape: `Rk-Dn armed (${r.rake.format(mode)}; tap + to step down)`,
    }
  }

  if (key === 'run' && r.run) {
    const irr = irregularPlan(r)
    if (irr) {
      return {
        value: r.run,
        tape: `Run <- ${current.format(mode)} (irreg ready: HIP → tan/angle/length)`,
      }
    }
    return { value: r.run, tape: `Run <- ${current.format(mode)}` }
  }

  return { value: current, tape: label }
}
