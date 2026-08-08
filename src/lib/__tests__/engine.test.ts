import { describe, expect, it } from 'vitest'
import { CalcEngine } from '../engine.ts'

describe('CalcEngine', () => {
  it('adds two FIS lengths', () => {
    const eng = new CalcEngine()
    eng.inputDigit(1)
    eng.advanceFisSegment()
    eng.inputDigit(6) // 1' 6"
    eng.setOperator('+')
    eng.inputDigit(0)
    eng.advanceFisSegment()
    eng.inputDigit(6) // 0' 6"
    eng.equals()
    expect(eng.getValue().toInches()).toBe(24)
    expect(eng.getDisplay()).toBe('2 : 0 : 0/16')
  })

  it('converts modes without changing length', () => {
    const eng = new CalcEngine()
    eng.inputDigit(1)
    eng.inputDigit(0)
    eng.advanceFisSegment()
    eng.inputDigit(6)
    eng.setMode('INCH')
    expect(eng.getValue().toInches()).toBe(126)
    eng.setMode('MET')
    expect(eng.getValue().toMm()).toBeCloseTo(126 * 25.4, 5)
  })
})
