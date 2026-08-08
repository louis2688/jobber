import { Dimension } from './dimension.ts'
import type { DisplayMode } from './dimension.ts'
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
  } = { a: null, b: null, c: null, A: null, B: null, C: null }

  roof: {
    pitch: number | null
    rise: Dimension | null
    run: Dimension | null
    slope: Dimension | null
    deg: number | null
    spac: Dimension | null
  } = {
    pitch: null,
    rise: null,
    run: null,
    slope: null,
    deg: null,
    spac: null,
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
      this.oblique = { a: null, b: null, c: null, A: null, B: null, C: null }
    } else if (program === 'roof') {
      this.roof = {
        pitch: null,
        rise: null,
        run: null,
        slope: null,
        deg: null,
        spac: null,
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
  if (key === 'dmsin') return { tape: 'DMSin (enter decimal degrees + DEG)' }

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
    return {
      value: Dimension.fromFeet(t.deg),
      forceDec: true,
      tape: `deg ${t.deg.toFixed(2)}`,
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
    c.radius = current
    c.diameter = Dimension.fromInches(current.toInches() * 2)
    return { value: current, tape: `RAD <- ${current.format(mode)}` }
  }
  if (key === 'rise') {
    c.diameter = current
    c.radius = Dimension.fromInches(current.toInches() / 2)
    return { value: current, tape: `Diam <- ${current.format(mode)}` }
  }
  if (key === 'deg') {
    c.deg = numFromDim(current, mode)
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
    c.seg = current
    return { value: current, tape: `SEG <- ${current.format(mode)}` }
  }

  const r = ensureCircleRadius(c)
  if (r == null && ['area', 'help', 'retr', 'dmsin'].includes(key)) {
    throw new Error('Enter RAD or Diam first')
  }

  if (key === 'area' && r != null) {
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
      if (half > r) throw new Error('Cord > diameter')
      const mo = r - Math.sqrt(r * r - half * half)
      return {
        value: Dimension.fromInches(mo),
        tape: `M.O. ${Dimension.fromInches(mo).format(mode)}`,
      }
    }
    return { value: Dimension.fromInches(r), tape: 'M.O. (enter Cord for offset)' }
  }

  return { value: current, tape: label }
}

function solveStairs(s: ModeBags['stairs']): void {
  const riser = s.riserH?.toInches() ?? null
  const tread = s.trdWth?.toInches() ?? null
  let flfl = s.flfl?.toInches() ?? null
  let steps = s.steps
  let run = s.run?.toInches() ?? null

  if (flfl != null && riser != null && steps == null) {
    steps = Math.max(1, Math.round(flfl / riser))
    s.steps = steps
  }
  if (flfl != null && steps != null && riser == null) {
    s.riserH = Dimension.fromInches(flfl / steps)
  }
  if (riser != null && steps != null && flfl == null) {
    s.flfl = Dimension.fromInches(riser * steps)
  }
  if (tread != null && steps != null && run == null) {
    s.run = Dimension.fromInches(tread * Math.max(steps - 1, 0))
  }
  if (run != null && steps != null && steps > 1 && tread == null) {
    s.trdWth = Dimension.fromInches(run / (steps - 1))
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
    s.riserH = current
    solveStairs(s)
    return { value: current, tape: `riserH <- ${current.format(mode)}` }
  }
  if (key === 'deg') {
    s.trdWth = current
    solveStairs(s)
    return { value: current, tape: `trdWth <- ${current.format(mode)}` }
  }
  if (key === 'rise') {
    s.flfl = current
    solveStairs(s)
    return { value: current, tape: `FL-FL <- ${current.format(mode)}` }
  }
  if (key === 'area') {
    s.steps = Math.max(1, Math.round(Math.abs(numFromDim(current, mode))))
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
    const v = s.riserH ?? current
    return { value: v, tape: `1stStp ${v.format(mode)}` }
  }
  if (key === 'slp') {
    solveStairs(s)
    const rise = s.flfl?.toInches()
    const run = s.run?.toInches()
    if (rise == null || run == null) throw new Error('Need FL-FL & Run')
    const str = Math.hypot(rise, run)
    return {
      value: Dimension.fromInches(str),
      tape: `stringr ${Dimension.fromInches(str).format(mode)}`,
    }
  }
  if (key === 'dmsin') {
    solveStairs(s)
    const rise = s.riserH?.toInches()
    const run = s.trdWth?.toInches()
    if (rise == null || run == null || run === 0) throw new Error('Need riserH & trdWth')
    const pitch = (rise / run) * 12
    return {
      value: Dimension.fromFeet(pitch),
      forceDec: true,
      tape: `pitch ${pitch.toFixed(4)}/12`,
    }
  }
  if (key === 'retr') {
    solveStairs(s)
    const rise = s.riserH?.toInches()
    const run = s.trdWth?.toInches()
    if (rise == null || run == null || run === 0) throw new Error('Need riserH & trdWth')
    const ang = rad2deg(Math.atan(rise / run))
    return {
      value: Dimension.fromFeet(ang),
      forceDec: true,
      tape: `angle ${ang.toFixed(2)} deg`,
    }
  }

  return { value: current, tape: label }
}

function solveOblique(o: ModeBags['oblique']): void {
  if (o.A != null && o.B != null && o.C == null) o.C = 180 - o.A - o.B
  if (o.A != null && o.C != null && o.B == null) o.B = 180 - o.A - o.C
  if (o.B != null && o.C != null && o.A == null) o.A = 180 - o.B - o.C

  let a = o.a?.toInches() ?? null
  let b = o.b?.toInches() ?? null
  let c = o.c?.toInches() ?? null
  let A = o.A
  let B = o.B
  let C = o.C

  if (a != null && b != null && c != null) {
    A = rad2deg(Math.acos(Math.min(1, Math.max(-1, (b * b + c * c - a * a) / (2 * b * c)))))
    B = rad2deg(Math.acos(Math.min(1, Math.max(-1, (a * a + c * c - b * b) / (2 * a * c)))))
    C = 180 - A - B
    o.A = A
    o.B = B
    o.C = C
    return
  }

  if (a != null && b != null && C != null && c == null) {
    c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(deg2rad(C)))
    o.c = Dimension.fromInches(c)
    A = rad2deg(Math.asin(Math.min(1, (a * Math.sin(deg2rad(C))) / c)))
    B = 180 - C - A
    o.A = A
    o.B = B
    return
  }

  if (A != null && a != null) {
    const sinA = Math.sin(deg2rad(A))
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
    o.a = current
    solveOblique(o)
    return { value: o.a, tape: `a side <- ${current.format(mode)}` }
  }
  if (key === 'rise') {
    o.b = current
    solveOblique(o)
    return { value: o.b, tape: `b side <- ${current.format(mode)}` }
  }
  if (key === 'run') {
    o.c = current
    solveOblique(o)
    return { value: o.c, tape: `c side <- ${current.format(mode)}` }
  }
  if (key === 'deg') {
    o.A = n
    solveOblique(o)
    return { value: Dimension.fromFeet(o.A), forceDec: true, tape: `A deg <- ${o.A}` }
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
    const deg = Math.floor(Math.abs(o.A))
    const minFloat = (Math.abs(o.A) - deg) * 60
    const min = Math.floor(minFloat)
    const sec = (minFloat - min) * 60
    return {
      value: Dimension.fromFeet(o.A),
      forceDec: true,
      tape: `DMS ${deg}° ${min}' ${sec.toFixed(1)}"`,
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
    return { tape: 'DMSin (enter deg)', value: current }
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
    r.spac = current
    return { value: current, tape: `Spac <- ${current.format(mode)}` }
  }
  if (key === 'pitch') {
    r.pitch = Math.abs(numFromDim(current, mode))
    return {
      value: Dimension.fromFeet(r.pitch),
      forceDec: true,
      tape: `pitch ${r.pitch}/12`,
    }
  }
  if (key === 'deg') {
    r.deg = numFromDim(current, mode)
    r.pitch = 12 * Math.tan(deg2rad(r.deg))
    return {
      value: Dimension.fromFeet(r.deg),
      forceDec: true,
      tape: `DEG ${r.deg}`,
    }
  }
  if (key === 'rise') r.rise = current
  else if (key === 'run') r.run = current
  else if (key === 'slp') r.slope = current

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

  if (key === 'help') {
    if (!r.slope) throw new Error('Need Rise/Run or Pitch+Run')
    const hip = r.slope.toInches() * Math.SQRT2
    return {
      value: Dimension.fromInches(hip),
      tape: `HIP ${Dimension.fromInches(hip).format(mode)}`,
    }
  }
  if (key === 'dmsin' || key === 'retr') {
    if (r.pitch == null || !r.spac) throw new Error('Need pitch & Spac')
    const diff = (r.pitch / 12) * r.spac.toInches()
    return {
      value: Dimension.fromInches(Math.abs(diff)),
      tape: `${label} ${Dimension.fromInches(Math.abs(diff)).format(mode)}`,
    }
  }

  if (key === 'rise' && r.rise) return { value: r.rise, tape: `Rise <- ${current.format(mode)}` }
  if (key === 'run' && r.run) return { value: r.run, tape: `Run <- ${current.format(mode)}` }
  if (key === 'slp' && r.slope) return { value: r.slope, tape: `SLP ${r.slope.format(mode)}` }

  return { value: current, tape: label }
}
