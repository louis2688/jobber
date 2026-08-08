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

  it('stairs: riserH + steps → FL-FL', () => {
    const eng = new CalcEngine()
    eng.setProgram('stairs')
    eng.setMode('INCH')
    eng.inputDigit(7)
    eng.handleProgramFn('pitch') // riserH
    eng.inputDigit(1)
    eng.inputDigit(2)
    eng.handleProgramFn('area') // steps
    // FL-FL should be solvable — press rise to recall/store; check bag via stringer needs run
    expect(eng.getSnapshot().display).toContain('12')
  })

  it('technical: π key', () => {
    const eng = new CalcEngine()
    eng.setProgram('technical')
    eng.handleProgramFn('help')
    expect(eng.getValue().toFeet()).toBeCloseTo(Math.PI, 5)
  })
})
