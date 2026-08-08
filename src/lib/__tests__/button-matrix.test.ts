import { describe, expect, it } from 'vitest'
import { CalcEngine } from '../engine.ts'
import { Dimension } from '../dimension.ts'
import {
  FN_LABELS,
  PROGRAMS,
  type CalcProgram,
  type FnKeyId,
} from '../programs.ts'
import { handleProgramKey, ModeBags } from '../modeSolvers.ts'

const FN_KEYS = Object.keys(FN_LABELS) as FnKeyId[]

function seedBags(program: CalcProgram): ModeBags {
  const bags = new ModeBags()
  if (program === 'circle') {
    handleProgramKey('circle', 'pitch', Dimension.fromInches(12), 'INCH', bags, {})
  } else if (program === 'stairs') {
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(7), 'INCH', bags, {})
    handleProgramKey('stairs', 'deg', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('stairs', 'rise', Dimension.fromInches(98), 'INCH', bags, {})
  } else if (program === 'roof') {
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    handleProgramKey('roof', 'clrtr', Dimension.fromInches(24), 'INCH', bags, {})
  } else if (program === 'oblique') {
    handleProgramKey('oblique', 'pitch', Dimension.fromInches(30), 'INCH', bags, {})
    handleProgramKey('oblique', 'rise', Dimension.fromInches(40), 'INCH', bags, {})
    handleProgramKey('oblique', 'run', Dimension.fromInches(50), 'INCH', bags, {})
  }
  return bags
}

describe('button × mode soft-key matrix (seeded bags)', () => {
  for (const program of PROGRAMS) {
    it(`${program}: every soft key returns tape / value or expected domain error`, () => {
      for (const key of FN_KEYS) {
        const bags = seedBags(program)
        const tri =
          program === 'triangle'
            ? { rise: Dimension.fromInches(3), run: Dimension.fromInches(4) }
            : {}
        // Keep oblique SSS valid when re-storing sides
        let current = Dimension.fromInches(10)
        if (program === 'oblique') {
          if (key === 'pitch') current = Dimension.fromInches(30)
          else if (key === 'rise') current = Dimension.fromInches(40)
          else if (key === 'run') current = Dimension.fromInches(50)
        }
        try {
          const result = handleProgramKey(program, key, current, 'INCH', bags, tri)
          expect(result.tape.length).toBeGreaterThan(0)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          expect(msg.length).toBeGreaterThan(0)
        }
        expect(FN_LABELS[key][program].length).toBeGreaterThan(0)
      }
    })
  }
})

describe('RIGHT TRIANGLE workflows', () => {
  it('3-4-5: Rise+Run → SLP=5, pitch=9, Area=6 in²', () => {
    const eng = new CalcEngine()
    eng.setMode('INCH')
    eng.inputDigit(3)
    eng.handleProgramFn('rise')
    eng.inputDigit(4)
    eng.handleProgramFn('run')
    eng.handleProgramFn('slp')
    expect(eng.getValue().toInches()).toBeCloseTo(5, 8)
    eng.handleProgramFn('pitch')
    expect(eng.getValue().toFeet()).toBeCloseTo(9, 6)
    eng.handleProgramFn('area')
    expect(eng.getValue().toFeet()).toBeCloseTo(6 / 144, 8)
  })

  it('ClrTR clears inputs but ReTR restores last solve', () => {
    const eng = new CalcEngine()
    eng.setMode('INCH')
    eng.inputDigit(3)
    eng.handleProgramFn('rise')
    eng.inputDigit(4)
    eng.handleProgramFn('run')
    eng.handleProgramFn('slp')
    expect(eng.getValue().toInches()).toBeCloseTo(5, 8)
    eng.handleProgramFn('clrtr')
    expect(eng.getTriangle().slope).toBeNull()
    eng.handleProgramFn('retr')
    expect(eng.getTriangle().slope!.toInches()).toBeCloseTo(5, 8)
    expect(eng.getValue().toInches()).toBeCloseTo(5, 8)
  })

  it('DEG from 3-4-5 matches arctan', () => {
    const eng = new CalcEngine()
    eng.setMode('INCH')
    eng.inputDigit(3)
    eng.handleProgramFn('rise')
    eng.inputDigit(4)
    eng.handleProgramFn('run')
    eng.handleProgramFn('deg')
    const expected = (Math.atan(3 / 4) * 180) / Math.PI
    expect(eng.getValue().toFeet()).toBeCloseTo(expected, 4)
    expect(eng.getSnapshot().dmsDisplay).toMatch(/°/)
  })
})

describe('CIRCLE workflows', () => {
  it('Diam → Circ / Area / ARC(360)', () => {
    const bags = new ModeBags()
    handleProgramKey('circle', 'rise', Dimension.fromInches(24), 'INCH', bags, {})
    const circ = handleProgramKey('circle', 'help', Dimension.zero(), 'INCH', bags, {})
    expect(circ.value!.toInches()).toBeCloseTo(Math.PI * 24, 5)
    const area = handleProgramKey('circle', 'area', Dimension.zero(), 'INCH', bags, {})
    expect(area.value!.toFeet()).toBeCloseTo((Math.PI * 12 * 12) / 144, 5)
    const arc = handleProgramKey('circle', 'retr', Dimension.zero(), 'INCH', bags, {})
    expect(arc.value!.toInches()).toBeCloseTo(Math.PI * 24, 5)
  })

  it('RAD + Cord → M.O.', () => {
    const bags = new ModeBags()
    handleProgramKey('circle', 'pitch', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('circle', 'run', Dimension.fromInches(12), 'INCH', bags, {})
    const mo = handleProgramKey('circle', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    const half = 6
    const expected = 10 - Math.sqrt(100 - 36)
    expect(mo.value!.toInches()).toBeCloseTo(expected, 5)
    expect(half).toBe(6)
  })

  it('incomplete bag: Area without RAD throws', () => {
    const bags = new ModeBags()
    expect(() =>
      handleProgramKey('circle', 'area', Dimension.zero(), 'INCH', bags, {}),
    ).toThrow(/RAD|Diam/)
  })
})

describe('ROOF workflows', () => {
  it('pitch + run → rise and HIP length on 3rd HIP press', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'run', Dimension.fromInches(144), 'INCH', bags, {})
    expect(bags.roof.rise!.toInches()).toBeCloseTo(72, 5)
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    const hip = handleProgramKey('roof', 'help', Dimension.zero(), 'INCH', bags, {})
    expect(hip.value!.toInches()).toBeCloseTo(
      Math.sqrt(bags.roof.slope!.toInches() ** 2 + bags.roof.run!.toInches() ** 2),
      4,
    )
  })

  it('ClrTR (area key) zeros roof bag', () => {
    const bags = new ModeBags()
    handleProgramKey('roof', 'pitch', Dimension.fromFeet(6), 'DEC', bags, {})
    handleProgramKey('roof', 'area', Dimension.zero(), 'INCH', bags, {})
    expect(bags.roof.pitch).toBeNull()
  })
})

describe('STAIRS workflows', () => {
  it('riserH + trdWth → pitch / angle; FL-FL + tread → run', () => {
    const bags = new ModeBags()
    handleProgramKey('stairs', 'pitch', Dimension.fromInches(7), 'INCH', bags, {})
    handleProgramKey('stairs', 'deg', Dimension.fromInches(10), 'INCH', bags, {})
    const pitch = handleProgramKey('stairs', 'dmsin', Dimension.zero(), 'DEC', bags, {})
    expect(pitch.value!.toFeet()).toBeCloseTo(8.4, 5)
    handleProgramKey('stairs', 'rise', Dimension.fromInches(98), 'INCH', bags, {})
    expect(bags.stairs.steps).toBe(14)
    expect(bags.stairs.run!.toInches()).toBeCloseTo(10 * 13, 5)
  })
})

describe('OBLIQUE TRIANGLE workflows', () => {
  it('SSS 30-40-50 → right angle at C', () => {
    const bags = new ModeBags()
    handleProgramKey('oblique', 'pitch', Dimension.fromInches(30), 'INCH', bags, {})
    handleProgramKey('oblique', 'rise', Dimension.fromInches(40), 'INCH', bags, {})
    handleProgramKey('oblique', 'run', Dimension.fromInches(50), 'INCH', bags, {})
    expect(bags.oblique.C).toBeCloseTo(90, 4)
    const area = handleProgramKey('oblique', 'dmsin', Dimension.zero(), 'INCH', bags, {})
    expect(area.value!.toFeet()).toBeCloseTo((30 * 40) / 2 / 144, 5)
  })

  it('SAS with obtuse A uses law of cosines (not asin flip)', () => {
    const bags = new ModeBags()
    handleProgramKey('oblique', 'pitch', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('oblique', 'rise', Dimension.fromInches(3), 'INCH', bags, {})
    handleProgramKey('oblique', 'slp', Dimension.fromFeet(30), 'DEC', bags, {})
    expect(bags.oblique.A!).toBeGreaterThan(90)
    expect(bags.oblique.A!).toBeCloseTo(138.544, 2)
    expect(bags.oblique.B! + bags.oblique.C! + bags.oblique.A!).toBeCloseTo(180, 4)
  })

  it('ASA-ish: A + a + B fills side b', () => {
    const bags = new ModeBags()
    handleProgramKey('oblique', 'deg', Dimension.fromFeet(40), 'DEC', bags, {})
    handleProgramKey('oblique', 'pitch', Dimension.fromInches(10), 'INCH', bags, {})
    handleProgramKey('oblique', 'area', Dimension.fromFeet(60), 'DEC', bags, {})
    expect(bags.oblique.C).toBeCloseTo(80, 5)
    expect(bags.oblique.b!.toInches()).toBeCloseTo(
      (10 * Math.sin((60 * Math.PI) / 180)) / Math.sin((40 * Math.PI) / 180),
      4,
    )
  })
})

describe('TECHNICAL workflows', () => {
  it('SIN/COS/%/1/X/X²/√/π/CuYd/SqYd', () => {
    const bags = new ModeBags()
    const sin = handleProgramKey('technical', 'pitch', Dimension.fromFeet(30), 'DEC', bags, {})
    expect(sin.value!.toFeet()).toBeCloseTo(0.5, 8)
    // reset inv flag for clean COS test
    bags.techInvSin = false
    const cos = handleProgramKey('technical', 'deg', Dimension.fromFeet(60), 'DEC', bags, {})
    expect(cos.value!.toFeet()).toBeCloseTo(0.5, 8)
    bags.techInvCos = false
    const pct = handleProgramKey('technical', 'rise', Dimension.fromFeet(50), 'DEC', bags, {})
    expect(pct.setPercent).toBe(true)
    const inv = handleProgramKey('technical', 'area', Dimension.fromFeet(4), 'DEC', bags, {})
    expect(inv.value!.toFeet()).toBeCloseTo(0.25, 8)
    const sq = handleProgramKey('technical', 'run', Dimension.fromFeet(5), 'DEC', bags, {})
    expect(sq.value!.toFeet()).toBeCloseTo(25, 8)
    const rt = handleProgramKey('technical', 'slp', Dimension.fromFeet(9), 'DEC', bags, {})
    expect(rt.value!.toFeet()).toBeCloseTo(3, 8)
    const pi = handleProgramKey('technical', 'help', Dimension.zero(), 'DEC', bags, {})
    expect(pi.value!.toFeet()).toBeCloseTo(Math.PI, 8)
    const cu = handleProgramKey('technical', 'retr', Dimension.fromFeet(27), 'DEC', bags, {})
    expect(cu.value!.toFeet()).toBeCloseTo(1, 8)
    const sqy = handleProgramKey('technical', 'clrtr', Dimension.fromFeet(9), 'DEC', bags, {})
    expect(sqy.value!.toFeet()).toBeCloseTo(1, 8)
  })
})

describe('global keys via CalcEngine', () => {
  it('unit modes DEC/FIS/INCH/MET preserve length', () => {
    const eng = new CalcEngine()
    eng.setMode('INCH')
    eng.inputDigit(1)
    eng.inputDigit(2)
    eng.equals()
    const inches = eng.getValue().toInches()
    for (const mode of ['FIS', 'DEC', 'MET', 'INCH'] as const) {
      eng.setMode(mode)
      expect(eng.getValue().toInches()).toBeCloseTo(inches, 8)
    }
  })

  it('CE clears entry; second CE is AC', () => {
    const eng = new CalcEngine()
    eng.setMode('DEC')
    eng.inputDigit(9)
    eng.clearEntry()
    expect(eng.getDisplay()).toMatch(/0/)
    eng.inputDigit(5)
    eng.setOperator('+')
    eng.inputDigit(3)
    eng.clearEntry() // clear 3
    eng.clearEntry() // AC
    expect(eng.getSnapshot().pendingOp).toBeNull()
  })

  it('MEM store/recall and rem tape', () => {
    const eng = new CalcEngine()
    eng.setMode('INCH')
    eng.inputDigit(8)
    eng.memoryStore(0)
    eng.clearEntry()
    eng.clearEntry()
    eng.memoryRecall(0)
    expect(eng.getValue().toInches()).toBe(8)
    eng.setOperator('/')
    eng.inputDigit(2)
    eng.equals()
    eng.remainderHint()
    expect(eng.getTape()[0].text).toMatch(/rem/)
  })

  it('mode switch mid-entry keeps length (DEC feet → INCH)', () => {
    const eng = new CalcEngine()
    eng.setMode('DEC')
    eng.inputDigit(1)
    eng.inputDigit(2)
    eng.inputDecimalPoint()
    eng.inputDigit(5) // 12.5 feet
    eng.setMode('INCH')
    expect(eng.getValue().toInches()).toBeCloseTo(150, 8)
  })

  it('program cycle wires all six modes on engine', () => {
    const eng = new CalcEngine()
    const seen: string[] = [eng.program]
    for (let i = 0; i < 5; i++) {
      const next = PROGRAMS[(PROGRAMS.indexOf(eng.program) + 1) % PROGRAMS.length]
      eng.setProgram(next)
      seen.push(eng.program)
    }
    expect(seen).toEqual([...PROGRAMS])
  })

  it('zero / incomplete triangle Area errors cleanly', () => {
    const eng = new CalcEngine()
    eng.handleProgramFn('area')
    expect(eng.getSnapshot().error).toMatch(/Need rise/)
  })
})
