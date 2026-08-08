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
    seg: Dimension | null
    spac: Dimension | null
  } = {
    radius: null,
    diameter: null,
    deg: null,
    cord: null,
    seg: null,
    spac: null,
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
    pitch: number | null
    /** Second pitch for irregular hip (rise per 12). */
    pitch2: number | null
    rise: Dimension | null
    run: Dimension | null
    slope: Dimension | null
    deg: number | null
    spac: Dimension | null
    /** Bay index for rake / jack sequence (1-based). */
    rakeIndex: number
  } = {
    pitch: null,
    pitch2: null,
    rise: null,
    run: null,
    slope: null,
    deg: null,
    spac: null,
    rakeIndex: 0,
  }

  clear(program: CalcProgram): void {
    if (program === 'circle') {
      this.circle = {
        radius: null,
        diameter: null,
        deg: null,
        cord: null,
        seg: null,
        spac: null,
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
        rakeIndex: 0,
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
      return handleTechnical(key, current, mode, label)
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
  if (field === 'pitch') next.pitch = Math.abs(numFromDim(current, mode))
  else if (field === 'deg') next.deg = numFromDim(current, mode)
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

/** Segment height h from radius r and central angle deg. */
function segmentHeight(r: number, deg: number): number {
  const theta = deg2rad(Math.abs(deg))
  return r * (1 - Math.cos(theta / 2))
}

/** Segment area (square inches) from r and central angle. */
function segmentArea(r: number, deg: number): number {
  const theta = deg2rad(Math.abs(deg))
  return 0.5 * r * r * (theta - Math.sin(theta))
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
    c.spac = current
    return { value: current, tape: `Spac <- ${current.format(mode)}` }
  }
  if (key === 'pitch') {
    if (current.toInches() <= 0) throw new Error('RAD must be > 0')
    c.radius = current
    c.diameter = Dimension.fromInches(current.toInches() * 2)
    return { value: current, tape: `RAD <- ${current.format(mode)}` }
  }
  if (key === 'rise') {
    if (current.toInches() <= 0) throw new Error('Diam must be > 0')
    c.diameter = current
    c.radius = Dimension.fromInches(current.toInches() / 2)
    return { value: current, tape: `Diam <- ${current.format(mode)}` }
  }
  if (key === 'deg') {
    c.deg = numFromDim(current, mode)
    if (Math.abs(c.deg) > 360) throw new Error('DEG must be ≤ 360')
    return {
      value: Dimension.fromFeet(c.deg),
      forceDec: true,
      tape: `DEG <- ${c.deg.toFixed(2)}`,
    }
  }
  if (key === 'run') {
    c.cord = current
    return { value: current, tape: `Cord <- ${current.format(mode)}` }
  }
  if (key === 'slp') {
    // SEG: store height, or compute from RAD+DEG when height not intended
    const r = ensureCircleRadius(c)
    if (r != null && c.deg != null && current.isZero()) {
      const h = segmentHeight(r, c.deg)
      c.seg = Dimension.fromInches(h)
      return {
        value: c.seg,
        tape: `SEG h ${c.seg.format(mode)}`,
      }
    }
    if (r != null && current.toInches() > 0) {
      if (current.toInches() > 2 * r) throw new Error('SEG > diameter')
      c.seg = current
      // Derive central angle from segment height: h = r(1-cos(θ/2))
      const h = current.toInches()
      const cosHalf = 1 - h / r
      if (Math.abs(cosHalf) > 1) throw new Error('Invalid SEG for radius')
      c.deg = rad2deg(2 * Math.acos(Math.min(1, Math.max(-1, cosHalf))))
      return {
        value: current,
        tape: `SEG <- ${current.format(mode)} (DEG ${c.deg.toFixed(2)})`,
      }
    }
    c.seg = current
    return { value: current, tape: `SEG <- ${current.format(mode)}` }
  }

  const r = ensureCircleRadius(c)
  if (r == null && ['area', 'help', 'retr', 'dmsin'].includes(key)) {
    throw new Error('Enter RAD or Diam first')
  }

  if (key === 'area' && r != null) {
    // If DEG set, return segment area; else full circle
    if (c.deg != null && Math.abs(c.deg) < 360 - 1e-9) {
      const a = segmentArea(r, c.deg)
      const sqft = a / 144
      return {
        value: Dimension.fromFeet(sqft),
        tape: `SegArea ${sqft.toFixed(4)} ft2`,
      }
    }
    const sqft = (Math.PI * r * r) / 144
    return { value: Dimension.fromFeet(sqft), tape: `Area ${sqft.toFixed(4)} ft2` }
  }
  if (key === 'help' && r != null) {
    const circ = 2 * Math.PI * r
    return {
      value: Dimension.fromInches(circ),
      tape: `Circ ${Dimension.fromInches(circ).format(mode)}`,
    }
  }
  if (key === 'retr' && r != null) {
    const deg = c.deg ?? 360
    const arc = r * deg2rad(deg)
    return {
      value: Dimension.fromInches(arc),
      tape: `ARC ${Dimension.fromInches(arc).format(mode)}`,
    }
  }
  if (key === 'dmsin' && r != null) {
    if (c.cord) {
      const half = c.cord.toInches() / 2
      if (half > r + 1e-9) throw new Error('Cord > diameter')
      if (half > r) {
        return { value: Dimension.zero(), tape: 'M.O. 0 (cord = diameter)' }
      }
      const mo = r - Math.sqrt(Math.max(0, r * r - half * half))
      return {
        value: Dimension.fromInches(mo),
        tape: `M.O. ${Dimension.fromInches(mo).format(mode)}`,
      }
    }
    if (c.deg != null) {
      const h = segmentHeight(r, c.deg)
      return {
        value: Dimension.fromInches(h),
        tape: `M.O. ${Dimension.fromInches(h).format(mode)} (from DEG)`,
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
    steps = Math.max(1, Math.round(flfl / riser))
    s.steps = steps
    // Actual riser from rounded step count
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
    s.nose = current
    return { value: current, tape: `nose <- ${current.format(mode)}` }
  }
  if (key === 'clrtr') {
    solveStairs(s)
    // 1st step height = riser (or FL-FL/steps)
    const v = s.riserH ?? current
    return { value: v, tape: `1stStp ${v.format(mode)}` }
  }
  if (key === 'slp') {
    solveStairs(s)
    const rise = s.flfl?.toInches()
    const run = s.run?.toInches()
    if (rise == null || run == null) throw new Error('Need FL-FL & Run')
    if (s.steps === 1 && run === 0) {
      return {
        value: Dimension.fromInches(rise),
        tape: `stringr ${Dimension.fromInches(rise).format(mode)} (platform)`,
      }
    }
    const str = Math.hypot(rise, run)
    return {
      value: Dimension.fromInches(str),
      tape: `stringr ${Dimension.fromInches(str).format(mode)}`,
    }
  }
  if (key === 'dmsin') {
    solveStairs(s)
    const rise = s.riserH?.toInches()
    const tread = s.trdWth?.toInches()
    if (rise == null || tread == null) throw new Error('Need riserH & trdWth')
    const nose = s.nose?.toInches() ?? 0
    const eff = tread - nose
    if (eff <= 0) throw new Error('trdWth − nose must be > 0')
    const pitch = (rise / eff) * 12
    const noseNote = nose > 0 ? ` (eff tread ${eff.toFixed(3)}")` : ''
    return {
      value: Dimension.fromFeet(pitch),
      forceDec: true,
      tape: `pitch ${pitch.toFixed(4)}/12${noseNote}`,
    }
  }
  if (key === 'retr') {
    solveStairs(s)
    const rise = s.riserH?.toInches()
    const tread = s.trdWth?.toInches()
    if (rise == null || tread == null) throw new Error('Need riserH & trdWth')
    const nose = s.nose?.toInches() ?? 0
    const eff = tread - nose
    if (eff <= 0) throw new Error('trdWth − nose must be > 0')
    const ang = rad2deg(Math.atan(rise / eff))
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

  // SAS: a, b, C → c
  if (a != null && b != null && C != null && c == null) {
    c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(deg2rad(C)))
    o.c = Dimension.fromInches(c)
    A = rad2deg(Math.asin(Math.min(1, Math.max(-1, (a * Math.sin(deg2rad(C))) / c))))
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
    return { tape: 'cleared oblique', value: Dimension.zero() }
  }

  return { value: current, tape: label }
}

function handleTechnical(
  key: FnKeyId,
  current: Dimension,
  mode: DisplayMode,
  label: string,
): ModeResult {
  const n = numFromDim(current, mode)

  if (key === 'pitch') {
    const v = Math.sin(deg2rad(n))
    return { value: Dimension.fromFeet(v), forceDec: true, tape: `SIN(${n})=${v.toFixed(6)}` }
  }
  if (key === 'deg') {
    const v = Math.cos(deg2rad(n))
    return { value: Dimension.fromFeet(v), forceDec: true, tape: `COS(${n})=${v.toFixed(6)}` }
  }
  if (key === 'rise') {
    const v = n / 100
    return { value: dimFromModeNumber(v, mode), forceDec: mode === 'DEC', tape: `% ${v}` }
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
 * Roof helpers (practical MVP, not full Jobber parity):
 * - Regular HIP ≈ common slope × √2 (square plan, equal pitches)
 * - Irregular HIP/VALLEY: pitch + pitch2 + run on primary side,
 *   rise = run×p1/12; run2 = rise×12/p2; hip/val = √(run²+run2²+rise²)
 *   (same intersection length; secondary common = √(run2²+rise²))
 * - Jack length at bay n: common − n × spac × √(1+(p/12)²)
 *   Enter bay # then Rk-Up to jump; value returns jack when common known
 * - Rk-Up / Rk-Dn: plumb n × spac × (pitch/12); stops when jack ≤ 0
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
    r.rakeIndex = 0
    return { value: current, tape: `Spac <- ${current.format(mode)}` }
  }
  if (key === 'pitch') {
    const p = Math.abs(numFromDim(current, mode))
    if (p === 0) throw new Error('pitch must be > 0')
    if (r.pitch != null && Math.abs(r.pitch - p) > 1e-9) {
      // Second distinct pitch → irregular hip/valley support
      r.pitch2 = p
      return {
        value: Dimension.fromFeet(p),
        forceDec: true,
        tape: `pitch2 ${p}/12 (irregular hip/val)`,
      }
    }
    r.pitch = p
    return {
      value: Dimension.fromFeet(r.pitch),
      forceDec: true,
      tape: `pitch ${r.pitch}/12`,
    }
  }
  if (key === 'deg') {
    const degIn = numFromDim(current, mode)
    // Accept packed DMS on DEG entry in roof mode
    r.deg = Math.abs(degIn) < 360 ? parseDmsInput(degIn) : degIn
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
    // Recover rise/run from common (slope) + pitch
    const factor = Math.sqrt(1 + (r.pitch / 12) ** 2)
    const run = r.slope.toInches() / factor
    r.run = Dimension.fromInches(run)
    r.rise = Dimension.fromInches((r.pitch / 12) * run)
  }

  if (key === 'help') {
    // HIP / VALLEY — irregular if pitch2 set with run
    const irr = irregularPlan(r)
    if (irr) {
      r.rise = Dimension.fromInches(irr.rise)
      return {
        value: Dimension.fromInches(irr.hipVal),
        tape: `HIP/VAL irr ${Dimension.fromInches(irr.hipVal).format(mode)} (run2 ${Dimension.fromInches(irr.run2).format(mode)}, SLP2 ${Dimension.fromInches(irr.common2).format(mode)})`,
      }
    }
    if (!r.slope) throw new Error('Need Rise/Run or Pitch+Run')
    // Regular square hip/valley approximation
    const hip = r.slope.toInches() * Math.SQRT2
    return {
      value: Dimension.fromInches(hip),
      tape: `HIP/VAL ${Dimension.fromInches(hip).format(mode)} (×√2)`,
    }
  }

  // After Rise with irregular plan: show secondary run (valley/hip plan width)
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

  if (key === 'dmsin' || key === 'retr') {
    if (r.pitch == null || !r.spac) throw new Error('Need pitch & Spac')
    const spac = r.spac.toInches()
    if (spac <= 0) throw new Error('Spac must be > 0')
    const unit = (r.pitch / 12) * spac
    const common = ensureRoofCommon(r)
    const factor = Math.sqrt(1 + (r.pitch / 12) ** 2)

    // Jump to bay: enter integer 1–48 in DEC, then Rk-Up (avoids treating jack lengths as bays)
    const raw = numFromDim(current, mode)
    const entered = Math.round(Math.abs(raw))
    const jumpBay =
      key === 'dmsin' &&
      mode === 'DEC' &&
      entered >= 1 &&
      entered <= 48 &&
      Math.abs(raw - entered) < 1e-9 &&
      !current.isZero()
    if (jumpBay) {
      r.rakeIndex = entered
    } else if (key === 'dmsin') {
      r.rakeIndex = Math.max(1, r.rakeIndex + 1)
    } else {
      r.rakeIndex = Math.max(1, r.rakeIndex - 1)
    }

    const n = r.rakeIndex
    const plumb = n * unit
    let jackIn: number | null = null
    if (common) {
      const drop = n * spac * factor
      jackIn = common.toInches() - drop
      if (jackIn <= 0) {
        r.rakeIndex = Math.max(1, n - 1)
        throw new Error(`Jack ≤ 0 at bay #${n} (last #${r.rakeIndex})`)
      }
    }

    if (jackIn != null) {
      return {
        value: Dimension.fromInches(jackIn),
        tape: `${label} #${n} jack ${Dimension.fromInches(jackIn).format(mode)} (plumb ${Dimension.fromInches(Math.abs(plumb)).format(mode)})`,
      }
    }
    return {
      value: Dimension.fromInches(Math.abs(plumb)),
      tape: `${label} #${n} plumb ${Dimension.fromInches(Math.abs(plumb)).format(mode)} (enter SLP/common for jack)`,
    }
  }

  if (key === 'run' && r.run) return { value: r.run, tape: `Run <- ${current.format(mode)}` }

  return { value: current, tape: label }
}
