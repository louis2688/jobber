import { describe, expect, it } from 'vitest'
import { CalcEngine } from '../engine.ts'

describe('CalcEngine', () => {
  it('adds two FIS lengths (Jobber shift: 160 + 060)', () => {
    const eng = new CalcEngine()
    // 1' 6" = keys 1, 6, 0 → 1 ft. : 6 : 0/16
    for (const d of [1, 6, 0]) eng.inputDigit(d)
    eng.setOperator('+')
    // 0' 6" = keys 0, 6, 0 → 0 ft. : 6 : 0/16
    for (const d of [0, 6, 0]) eng.inputDigit(d)
    eng.equals()
    expect(eng.getValue().toInches()).toBe(24)
    expect(eng.getDisplay()).toBe('2 ft. : 0 : 0/16 inch')
  })

  it('converts modes without changing length (1060 → 10\'6")', () => {
    const eng = new CalcEngine()
    for (const d of [1, 0, 6, 0]) eng.inputDigit(d)
    eng.setMode('INCH')
    expect(eng.getValue().toInches()).toBe(126)
    eng.setMode('MET')
    expect(eng.getValue().toMm()).toBeCloseTo(126 * 25.4, 5)
  })

  it('FIS digit entry matches Jobber video sequence', () => {
    const eng = new CalcEngine()
    eng.inputDigit(9)
    expect(eng.getDisplay()).toBe('0 ft. : 0 : 9/16 inch')
    eng.inputDigit(9)
    expect(eng.getDisplay()).toBe('0 ft. : 9 : 9/16 inch')
    eng.inputDigit(9)
    expect(eng.getDisplay()).toBe('9 ft. : 9 : 9/16 inch')
    eng.inputDigit(9)
    expect(eng.getDisplay()).toBe('99 ft. : 9 : 9/16 inch')
  })
})
