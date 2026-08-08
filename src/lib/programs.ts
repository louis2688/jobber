/** Jobber calculator programs — order matches jobberinstruments.com/demo */
export const PROGRAMS = [
  'triangle',
  'circle',
  'roof',
  'stairs',
  'oblique',
  'technical',
] as const

export type CalcProgram = (typeof PROGRAMS)[number]

export const PROGRAM_TITLE: Record<CalcProgram, string> = {
  triangle: 'RIGHT TRIANGLE',
  circle: 'CIRCLE',
  roof: 'ROOF',
  stairs: 'STAIRS',
  oblique: 'OBLIQUE TRIANGLE',
  technical: 'TECHNICAL',
}

export function nextProgram(current: CalcProgram): CalcProgram {
  const i = PROGRAMS.indexOf(current)
  return PROGRAMS[(i + 1) % PROGRAMS.length]
}

/** Left-column function key labels per program (Jobber data-* attrs). */
export type FnKeyId =
  | 'pitch'
  | 'deg'
  | 'rise'
  | 'area'
  | 'run'
  | 'slp'
  | 'dmsin'
  | 'retr'
  | 'help'
  | 'clrtr'

export const FN_LABELS: Record<FnKeyId, Record<CalcProgram, string>> = {
  pitch: {
    triangle: 'pitch',
    circle: 'RAD',
    roof: 'pitch',
    stairs: 'riserH',
    oblique: 'a side',
    technical: 'SINE',
  },
  deg: {
    triangle: 'DEG',
    circle: 'DEG',
    roof: 'DEG',
    stairs: 'trdWth',
    oblique: 'A deg',
    technical: 'COS',
  },
  rise: {
    triangle: 'Rise',
    circle: 'Diam',
    roof: 'Rise',
    stairs: 'FL-FL',
    oblique: 'b side',
    technical: '%',
  },
  area: {
    triangle: 'Area',
    circle: 'Area',
    roof: 'ClrTR',
    stairs: 'steps',
    oblique: 'B deg',
    technical: '1/X',
  },
  run: {
    triangle: 'Run',
    circle: 'Cord',
    roof: 'Run',
    stairs: 'Run',
    oblique: 'c side',
    technical: 'X²',
  },
  slp: {
    triangle: 'SLP',
    circle: 'SEG',
    roof: 'SLP',
    stairs: 'stringr',
    oblique: 'C deg',
    technical: '√',
  },
  dmsin: {
    triangle: 'DMSin',
    circle: 'M.O.',
    roof: 'Rk-Up',
    stairs: 'pitch',
    oblique: 'Area',
    technical: 'DMSin',
  },
  retr: {
    triangle: 'ReTR',
    circle: 'ARC',
    roof: 'Rk-Dn',
    stairs: 'angle',
    oblique: 'DMS',
    technical: 'CuYd',
  },
  help: {
    triangle: 'Help',
    circle: 'Circ',
    roof: 'HIP',
    stairs: 'nose',
    oblique: '…',
    technical: 'π',
  },
  clrtr: {
    triangle: 'ClrTR',
    circle: 'Spac',
    roof: 'Spac',
    stairs: '1stStp',
    oblique: '…',
    technical: 'SqYd',
  },
}

/** Which fn keys are yellow vs white for a program (Jobber themes). */
export function fnTone(id: FnKeyId, program: CalcProgram): 'yellow' | 'white' {
  if (program === 'triangle') {
    if (id === 'retr' || id === 'help' || id === 'clrtr') return 'white'
    return 'yellow'
  }
  if (program === 'circle') return 'yellow'
  if (program === 'roof') {
    if (id === 'area') return 'white'
    return 'yellow'
  }
  if (program === 'stairs') return 'yellow'
  if (program === 'oblique') {
    if (id === 'help' || id === 'clrtr') return 'white'
    return 'yellow'
  }
  // technical
  return 'yellow'
}
