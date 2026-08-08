import { describe, expect, it } from 'vitest'
import { CalcEngine } from '../engine.ts'
import {
  PROGRAMS,
  PROGRAM_TITLE,
  nextProgram,
  type CalcProgram,
} from '../programs.ts'
import { Dimension } from '../dimension.ts'
import { handleProgramKey, ModeBags } from '../modeSolvers.ts'
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

  it('circle: DEG + RAD → segment height via SEG', () => {
    const bags = new ModeBags()
    handleProgramKey('circle', 'pitch', Dimension.fromInches(12), 'INCH', bags, {})
    handleProgramKey('circle', 'deg', Dimension.fromFeet(90), 'DEC', bags, {})
    const seg = handleProgramKey('circle', 'slp', Dimension.zero(), 'INCH', bags, {})
    // h = r(1-cos(θ/2)) for 90° → 12(1-cos(45°))
    const expected = 12 * (1 - Math.cos(Math.PI / 4))
    expect(seg.value!.toInches()).toBeCloseTo(expected, 5)
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

  it('stairs: stringer from FL-FL + Run', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'rise', Dimension.fromInches(96), 'INCH', bags, {})
    handleProgramKey('stairs', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    const str = handleProgramKey('stairs', 'slp', Dimension.zero(), 'INCH', bags, {})
    expect(str.value!.toInches()).toBeCloseTo(Math.hypot(96, 120), 5)
  })

  it('roof: pitch + run → rise/slope and regular HIP', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    expect(bags.roof.rise!.toInches()).toBeCloseTo(72, 5)
    const hip = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    expect(hip.value!.toInches()).toBeCloseTo(bags.roof.slope!.toInches() * Math.SQRT2, 5)
  })

  it('roof: irregular HIP with pitch2', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(8), 'DEC', bags, {})
    expect(bags.roof.pitch).toBe(6)
    expect(bags.roof.pitch2).toBe(8)
    handleProgramKey('roof', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    const hip = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    const rise = (6 / 12) * 120
    const run2 = (rise * 12) / 8
    const expected = Math.sqrt(120 ** 2 + run2 ** 2 + rise ** 2)
    expect(hip.value!.toInches()).toBeCloseTo(expected, 4)
    expect(hip.tape).toMatch(/irr/)
  })

  it('roof: Rk-Up sequence advances bay index', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
    const r1 = handleProgramKey('roof', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    const r2 = handleProgramKey('roof', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    expect(r1.value!.toInches()).toBeCloseTo(12, 5) // 1 * 24 * 6/12
    expect(r2.value!.toInches()).toBeCloseTo(24, 5)
    expect(r2.tape).toMatch(/#2/)
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
  it('roof: irregular HIP/VAL reports run2 and SLP2', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(8), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    const hip = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    expect(hip.tape).toMatch(/HIP\/VAL irr/)
    expect(hip.tape).toMatch(/run2/)
    expect(hip.tape).toMatch(/SLP2/)
  })

  it('roof: jack sequence returns jack length when common known', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
    const common = bags.roof.slope!.toInches()
    const j1 = handleProgramKey('roof', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    const drop = 24 * Math.sqrt(1 + (6 / 12) ** 2)
    expect(j1.value!.toInches()).toBeCloseTo(common - drop, 4)
    expect(j1.tape).toMatch(/jack/)
  })

  it('roof: DEC bay jump then Rk-Up', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
    const r = handleProgramKey('roof', 'dmsin', Dimension.fromFeet(3), 'DEC', bags, {})
    expect(r.tape).toMatch(/#3/)
    expect(r.value!.toInches()).toBeCloseTo(36, 5)
  })

  it('stairs: nose reduces effective tread for pitch', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(7), 'INCH', bags, {})
    handleProgramKey('stairs', 'deg', Dimension.fromInches(11), 'INCH', bags, {})
    handleProgramKey('stairs', 'help', Dimension.fromInches(1), 'INCH', bags, {})
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

  it('stairs: platform steps=1 stringer equals FL-FL', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'rise', Dimension.fromInches(8), 'INCH', bags, {})
    handleProgramKey('stairs', 'area', Dimension.fromFeet(1), 'DEC', bags, {})
    const str = handleProgramKey('stairs', 'slp', Dimension.zero(), 'INCH', bags, {})
    expect(str.value!.toInches()).toBeCloseTo(8, 5)
    expect(str.tape).toMatch(/platform/)
  })

  it('roof: DEG 0 toggles jack side after irregular setup', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(8), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    expect(bags.roof.jackSide).toBe(1)
    const t = handleProgramKey('roof', 'deg', Dimension.zero(), 'DEC', bags, {})
    expect(bags.roof.jackSide).toBe(2)
    expect(t.tape).toMatch(/jack side 2/)
  })

  it('roof: side2 jack uses pitch2 common', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(8), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(120), 'INCH', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
    bags.roof.jackSide = 2
    const rise = (6 / 12) * 120
    const run2 = (rise * 12) / 8
    const common2 = Math.hypot(run2, rise)
    const factor2 = Math.sqrt(1 + (8 / 12) ** 2)
    const j1 = handleProgramKey('roof', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    expect(j1.tape).toMatch(/side2/)
    expect(j1.value!.toInches()).toBeCloseTo(common2 - 24 * factor2, 3)
  })

  it('stairs: steep stringer notes headroom', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'rise', Dimension.fromInches(120), 'INCH', bags, {})
    handleProgramKey('stairs', 'run', Dimension.fromInches(80), 'INCH', bags, {})
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
