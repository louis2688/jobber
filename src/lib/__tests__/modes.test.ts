import { describe, expect, it } from 'vitest'
import { CalcEngine } from '../engine.ts'
import {
  PROGRAMS,
  PROGRAM_TITLE,
  nextProgram,
  type CalcProgram,
} from '../programs.ts'
import { Dimension } from '../dimension.ts'
import { handleProgramKey, ModeBags, tryAdvancePlusStepper } from '../modeSolvers.ts'
import { parseDmsInput, dmsToDecimal, decimalToDms } from '../dms.ts'

describe('6 Jobber programs', () => {
  it('cycles all six modes in Jobber order', () => {
    let p: CalcProgram = PROGRAMS[0]
    const seen: string[] = [PROGRAM_TITLE[p]]
    for (let i = 0; i < 5; i++) {
      p = nextProgram(p)
      seen.push(PROGRAM_TITLE[p])
    }
    expect(seen).toEqual([
      'RIGHT TRIANGLE',
      'CIRCLE',
      'ROOF',
      'STAIRS',
      'OBLIQUE TRIANGLE',
      'TECHNICAL',
    ])
    expect(nextProgram(p)).toBe('triangle')
  })

  it('circle: Diam → Circ', () => {
    const bags = new ModeBags()
    const diam = Dimension.fromInches(24)
    handleProgramKey('circle', 'rise', diam, 'INCH', bags, {})
    const circ = handleProgramKey('circle', 'help', diam, 'INCH', bags, {})
    expect(circ.value!.toInches()).toBeCloseTo(Math.PI * 24, 5)
  })

  it('circle: SEG arms stepper and shows M.O.; Spac + + advances', () => {
    const bags = new ModeBags()
    handleProgramKey('circle', 'pitch', Dimension.fromInches(12), 'INCH', bags, {})
    handleProgramKey('circle', 'deg', Dimension.fromFeet(90), 'DEC', bags, {})
    const seg = handleProgramKey('circle', 'slp', Dimension.zero(), 'INCH', bags, {})
    // M.O. = r(1-cos(θ/2)) for 90°
    const expected = 12 * (1 - Math.cos(Math.PI / 4))
    expect(seg.value!.toInches()).toBeCloseTo(expected, 5)
    expect(bags.circle.rakeSet).toBe(true)
    handleProgramKey('circle', 'clrtr', Dimension.fromInches(1), 'INCH', bags, {})
    const step = tryAdvancePlusStepper('circle', bags, 'INCH')!
    expect(step.value!.toInches()).toBeGreaterThan(0)
    expect(bags.circle.rakeRemainderIn).toBeCloseTo(1, 8)
  })

  it('circle: rejects Cord > diameter for M.O.', () => {
    const bags = new ModeBags()
    handleProgramKey('circle', 'pitch', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('circle', 'run', Dimension.fromInches(30), 'INCH', bags, {})
    expect(() =>
      handleProgramKey('circle', 'dmsin', Dimension.zero(), 'INCH', bags, {}),
    ).toThrow(/Cord/)
  })

  it('stairs: riserH + steps → FL-FL', () => {
    const eng = new CalcEngine()
    eng.setProgram('stairs')
    eng.setMode('INCH')
    eng.inputDigit(7)
    eng.handleProgramFn('pitch') // riserH
    eng.inputDigit(1)
    eng.inputDigit(2)
    eng.handleProgramFn('area') // steps
    expect(eng.getSnapshot().display).toContain('12')
  })

  it('stairs: FL-FL + riserH rounds steps and adjusts riser', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'rise', Dimension.fromInches(105), 'INCH', bags, {})
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(7.5), 'INCH', bags, {})
    expect(bags.stairs.steps).toBe(14)
    expect(bags.stairs.riserH!.toInches()).toBeCloseTo(105 / 14, 5)
  })

  it('stairs: rejects zero riser', () => {
    const bags = new ModeBags()
    expect(() =>
      handleProgramKey('stairs', 'pitch', Dimension.zero(), 'INCH', bags, {}),
    ).toThrow(/riserH/)
  })

  it('stairs: stringer = √(riser²+tread²)×(steps−1) (Jobber)', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(7), 'INCH', bags, {})
    handleProgramKey('stairs', 'deg', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('stairs', 'rise', Dimension.fromInches(98), 'INCH', bags, {})
    const str = handleProgramKey('stairs', 'slp', Dimension.zero(), 'INCH', bags, {})
    expect(bags.stairs.steps).toBe(14)
    expect(str.value!.toInches()).toBeCloseTo(Math.hypot(7, 10) * 13, 5)
  })

  it('roof: pitch + run → rise/slope and regular HIP length (3rd HIP)', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    expect(bags.roof.rise!.toInches()).toBeCloseTo(72, 5)
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {}) // tan
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {}) // angle
    const hip = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {}) // length
    expect(hip.value!.toInches()).toBeCloseTo(
      Math.sqrt(bags.roof.slope!.toInches() ** 2 + bags.roof.run!.toInches() ** 2),
      5,
    )
  })

  it('roof: irregular HIP with pitch2', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(8), 'DEC', bags, {})
    expect(bags.roof.pitch).toBe(6)
    expect(bags.roof.pitch2).toBe(8)
    handleProgramKey('roof', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    const hip = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    const rise = (6 / 12) * 120
    const run2 = (rise * 12) / 8
    const expected = Math.sqrt(120 ** 2 + run2 ** 2 + rise ** 2)
    expect(hip.value!.toInches()).toBeCloseTo(expected, 4)
    expect(hip.tape).toMatch(/hip length/)
  })

  it('roof: Rk-Up arms then + advances plumb rise (Jobber)', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
    const arm = handleProgramKey('roof', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    expect(arm.value!.toInches()).toBe(0)
    expect(bags.roof.rakeSet).toBe(true)
    const r1 = tryAdvancePlusStepper('roof', bags, 'INCH')!
    const r2 = tryAdvancePlusStepper('roof', bags, 'INCH')!
    expect(r1.value!.toInches()).toBeCloseTo(12, 5) // tan(atan(0.5))*24
    expect(r2.value!.toInches()).toBeCloseTo(24, 5)
  })

  it('oblique: SSS solves angles', () => {
    const bags = new ModeBags()
    handleProgramKey('oblique', 'pitch', Dimension.fromInches(30), 'INCH', bags, {})
    handleProgramKey('oblique', 'rise', Dimension.fromInches(40), 'INCH', bags, {})
    handleProgramKey('oblique', 'run', Dimension.fromInches(50), 'INCH', bags, {})
    expect(bags.oblique.C).toBeCloseTo(90, 4)
  })

  it('oblique: SSA ambiguous reports second B', () => {
    const bags = new ModeBags()
    // A=30, a=10, b=16 → ambiguous
    handleProgramKey('oblique', 'deg', Dimension.fromFeet(30), 'DEC', bags, {})
    handleProgramKey('oblique', 'pitch', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('oblique', 'rise', Dimension.fromInches(16), 'INCH', bags, {})
    expect(bags.oblique.B).not.toBeNull()
    expect(bags.oblique.ambiguousB).not.toBeNull()
  })

  it('technical: π key', () => {
    const eng = new CalcEngine()
    eng.setProgram('technical')
    eng.handleProgramFn('help')
    expect(eng.getValue().toFeet()).toBeCloseTo(Math.PI, 5)
  })

  it('technical: 1/X and sqrt', () => {
    const bags = new ModeBags()
    const inv = handleProgramKey('technical', 'area', Dimension.fromFeet(4), 'DEC', bags, {})
    expect(inv.value!.toFeet()).toBeCloseTo(0.25, 8)
    const sq = handleProgramKey('technical', 'slp', Dimension.fromFeet(9), 'DEC', bags, {})
    expect(sq.value!.toFeet()).toBeCloseTo(3, 8)
  })
})

describe('DMS', () => {
  it('parses packed DD.MMSS', () => {
    expect(parseDmsInput(45.3015)).toBeCloseTo(45 + 30 / 60 + 15 / 3600, 6)
  })

  it('parses D:M:S string', () => {
    expect(parseDmsInput('12:30:00')).toBeCloseTo(12.5, 8)
  })

  it('round-trips decimal ↔ DMS', () => {
    const parts = decimalToDms(33.5)
    expect(dmsToDecimal(parts)).toBeCloseTo(33.5, 8)
  })

  it('triangle DMSin sets deg', () => {
    const eng = new CalcEngine()
    eng.setMode('DEC')
    eng.inputDigit(4)
    eng.inputDigit(5)
    eng.inputDecimalPoint()
    eng.inputDigit(3)
    eng.inputDigit(0)
    eng.inputDigit(0)
    eng.inputDigit(0)
    eng.handleProgramFn('dmsin')
    expect(eng.getValue().toFeet()).toBeCloseTo(45.5, 4)
  })
})

describe('multi-memory', () => {
  it('stores and recalls five slots independently', () => {
    const eng = new CalcEngine()
    eng.setMode('INCH')
    for (let i = 0; i < 5; i++) {
      eng.inputDigit(i + 1)
      eng.memoryStore(i)
      eng.clearEntry()
    }
    const labels = eng.getSnapshot().memories
    expect(labels[0]).toMatch(/1/)
    expect(labels[4]).toMatch(/5/)
    eng.memoryRecall(2)
    expect(eng.getValue().toInches()).toBe(3)
  })
})

describe('depth helpers', () => {
  it('roof: irregular HIP length tape reports run2', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(8), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    const hip = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    expect(hip.tape).toMatch(/hip length/)
    expect(hip.tape).toMatch(/run2/)
  })

  it('roof: Rk-Up + returns Jobber plumb tan(deg)×space (not jack common)', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
    handleProgramKey('roof', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    const j1 = tryAdvancePlusStepper('roof', bags, 'INCH')!
    expect(j1.value!.toInches()).toBeCloseTo(12, 4)
    expect(j1.tape).toMatch(/Rk-Up/)
  })

  it('roof: Rk-Dn arms at full rise then + steps down', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
    const arm = handleProgramKey('roof', 'retr', Dimension.zero(), 'INCH', bags, {})
    expect(arm.value!.toInches()).toBeCloseTo(72, 5)
    const step = tryAdvancePlusStepper('roof', bags, 'INCH')!
    // remainder 144-24=120; tan*120 = 60
    expect(step.value!.toInches()).toBeCloseTo(60, 5)
  })

  it('stairs: nose is nose-to-nose √(riser²+tread²); pitch = riser/tread×12', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(7), 'INCH', bags, {})
    handleProgramKey('stairs', 'deg', Dimension.fromInches(10), 'INCH', bags, {})
    const nose = handleProgramKey('stairs', 'help', Dimension.zero(), 'INCH', bags, {})
    expect(nose.value!.toInches()).toBeCloseTo(Math.hypot(7, 10), 5)
    const pitch = handleProgramKey('stairs', 'dmsin', Dimension.zero(), 'DEC', bags, {})
    expect(pitch.value!.toFeet()).toBeCloseTo((7 / 10) * 12, 5)
  })

  it('stairs: rejects riserH > FL-FL', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'rise', Dimension.fromInches(20), 'INCH', bags, {})
    expect(() =>
      handleProgramKey('stairs', 'pitch', Dimension.fromInches(24), 'INCH', bags, {}),
    ).toThrow(/riserH/)
  })

  it('stairs: platform steps=1 stringer is 0 (Jobber ×0 treads)', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(8), 'INCH', bags, {})
    handleProgramKey('stairs', 'deg', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('stairs', 'area', Dimension.fromFeet(1), 'DEC', bags, {})
    const str = handleProgramKey('stairs', 'slp', Dimension.zero(), 'INCH', bags, {})
    expect(str.value!.toInches()).toBeCloseTo(0, 5)
    expect(str.tape).toMatch(/platform/)
  })

  it('roof: DEG 0 toggles jack side after irregular setup', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(8), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    expect(bags.roof.jackSide).toBe(1)
    const tog = handleProgramKey('roof', 'deg', Dimension.zero(), 'DEC', bags, {})
    expect(bags.roof.jackSide).toBe(2)
    expect(tog.tape).toMatch(/jack side 2/)
  })

  it('roof: side2 Rk-Up + uses pitch2 plumb', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(8), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
    bags.roof.jackSide = 2
    handleProgramKey('roof', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    const j1 = tryAdvancePlusStepper('roof', bags, 'INCH')!
    expect(j1.tape).toMatch(/side2/)
    expect(j1.value!.toInches()).toBeCloseTo((8 / 12) * 24, 3)
  })

  it('stairs: steep stringer notes headroom', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('stairs', 'deg', Dimension.fromInches(8), 'INCH', bags, {})
    handleProgramKey('stairs', 'rise', Dimension.fromInches(120), 'INCH', bags, {})
    const str = handleProgramKey('stairs', 'slp', Dimension.zero(), 'INCH', bags, {})
    expect(str.tape).toMatch(/headroom/)
  })

  it('stairs: 1stStp summarizes risers/treads', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'rise', Dimension.fromInches(105), 'INCH', bags, {})
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(7.5), 'INCH', bags, {})
    handleProgramKey('stairs', 'deg', Dimension.fromInches(10), 'INCH', bags, {})
    const first = handleProgramKey('stairs', 'clrtr', Dimension.zero(), 'INCH', bags, {})
    expect(first.tape).toMatch(/1stStp/)
    expect(first.tape).toMatch(/risers/)
  })

  it('DMS: packed export and display string', () => {
    const parts = decimalToDms(45.5)
    expect(parts.degrees).toBe(45)
    expect(parts.minutes).toBe(30)
    const eng = new CalcEngine()
    eng.setMode('DEC')
    eng.setProgram('technical')
    eng.inputDigit(4)
    eng.inputDigit(5)
    eng.inputDecimalPoint()
    eng.inputDigit(3)
    eng.inputDigit(0)
    eng.inputDigit(0)
    eng.inputDigit(0)
    eng.handleProgramFn('dmsin')
    expect(eng.getSnapshot().dmsDisplay).toMatch(/45°/)
  })
})

describe('Jobber oracle alignment (jt.js)', () => {
  it('stairs: FL-FL/riser ceils fractional step count', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'rise', Dimension.fromInches(100), 'INCH', bags, {})
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(7.5), 'INCH', bags, {})
    // 100/7.5 = 13.333… → Jobber ceil → 14 (not Math.round → 13)
    expect(bags.stairs.steps).toBe(14)
    expect(bags.stairs.riserH!.toInches()).toBeCloseTo(100 / 14, 5)
  })

  it('roof HIP = √(common² + run²) not common×√2', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    const hip = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    const expected = Math.sqrt(bags.roof.slope!.toInches() ** 2 + 144 ** 2)
    expect(hip.value!.toInches()).toBeCloseTo(expected, 4)
    expect(hip.value!.toInches()).not.toBeCloseTo(bags.roof.slope!.toInches() * Math.SQRT2, 1)
  })

  it('technical % is binary op (500 % 10 = → 50)', () => {
    const eng = new CalcEngine()
    eng.setProgram('technical')
    eng.setMode('DEC')
    eng.inputDigit(5)
    eng.inputDigit(0)
    eng.inputDigit(0)
    eng.handleProgramFn('rise') // %
    eng.inputDigit(1)
    eng.inputDigit(0)
    eng.equals()
    expect(eng.getValue().toFeet()).toBeCloseTo(50, 8)
  })

  it('technical SINE then value does asin (Jobber toggle)', () => {
    const eng = new CalcEngine()
    eng.setProgram('technical')
    eng.setMode('DEC')
    eng.inputDigit(3)
    eng.inputDigit(0)
    eng.handleProgramFn('pitch') // sin → 0.5, arm inverse
    expect(eng.getValue().toFeet()).toBeCloseTo(0.5, 8)
    eng.handleProgramFn('pitch') // asin(0.5) → 30
    expect(eng.getValue().toFeet()).toBeCloseTo(30, 5)
  })

  it('ClrTR preserves ReTR last triangle', () => {
    const eng = new CalcEngine()
    eng.setMode('INCH')
    eng.inputDigit(3)
    eng.handleProgramFn('rise')
    eng.inputDigit(4)
    eng.handleProgramFn('run')
    eng.handleProgramFn('clrtr')
    eng.handleProgramFn('retr')
    expect(eng.getTriangle().slope!.toInches()).toBeCloseTo(5, 8)
  })

  it('oblique SAS obtuse A matches law of cosines', () => {
    const bags = new ModeBags()
    handleProgramKey('oblique', 'pitch', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('oblique', 'rise', Dimension.fromInches(3), 'INCH', bags, {})
    handleProgramKey('oblique', 'slp', Dimension.fromFeet(30), 'DEC', bags, {})
    expect(bags.oblique.A!).toBeGreaterThan(90)
  })
})

describe('Jobber parity gaps (jt.js)', () => {
  it('HIP key cycles tan → angle → length', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    const tan = handleProgramKey('roof', 'help', Dimension.zero(), 'DEC', bags, {})
    expect(tan.tape).toMatch(/hip tan/)
    expect(tan.value!.toFeet()).toBeLessThan(1)
    const ang = handleProgramKey('roof', 'help', Dimension.zero(), 'DEC', bags, {})
    expect(ang.tape).toMatch(/hip angle/)
    const len = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    expect(len.tape).toMatch(/hip length/)
    expect(len.value!.toInches()).toBeGreaterThan(144)
  })

  it('triangle pitch auto-flows to roof', () => {
    const eng = new CalcEngine()
    eng.setProgram('triangle')
    eng.setMode('DEC')
    eng.inputDigit(6)
    eng.handleProgramFn('pitch')
    expect(eng.getBags().roof.pitch).toBeCloseTo(6, 8)
  })

  it('circle Circ / Area / ARC invert to radius', () => {
    const bags = new ModeBags()
    const circ = Dimension.fromInches(2 * Math.PI * 10)
    const fromCirc = handleProgramKey('circle', 'help', circ, 'INCH', bags, {})
    expect(fromCirc.value!.toInches()).toBeCloseTo(10, 5)

    const bags2 = new ModeBags()
    const areaFt2 = Dimension.fromFeet((Math.PI * 10 * 10) / 144)
    const fromArea = handleProgramKey('circle', 'area', areaFt2, 'DEC', bags2, {})
    expect(fromArea.value!.toInches()).toBeCloseTo(10, 4)

    const bags3 = new ModeBags()
    handleProgramKey('circle', 'pitch', Dimension.fromInches(10), 'INCH', bags3, {})
    const arc = handleProgramKey(
      'circle',
      'retr',
      Dimension.fromInches(10 * (Math.PI / 2)),
      'INCH',
      bags3,
      {},
    )
    expect(bags3.circle.deg!).toBeCloseTo(90, 3)
    expect(arc.tape).toMatch(/ARC/)
  })

  it('rem uses Jobber getFIS truncation path', () => {
    const eng = new CalcEngine()
    // Jobber help example path: length ÷ 9 → rem via getFIS
    eng.setMode('INCH')
    for (const d of String(125).split('')) eng.inputDigit(Number(d))
    eng.inputDecimalPoint()
    eng.inputDigit(5)
    eng.setOperator('/')
    eng.inputDigit(9)
    eng.equals()
    eng.remainderHint()
    // Jobber: rem is small positive trim (often 1/16")
    expect(eng.getValue().toInches()).toBeGreaterThanOrEqual(0)
    expect(eng.getValue().toInches()).toBeLessThan(1)
  })

  it('pitch ratio <1 accepted as Jobber rise/run → stored /12', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(0.5), 'DEC', bags, {})
    expect(bags.roof.pitch).toBeCloseTo(6, 8)
  })
})
