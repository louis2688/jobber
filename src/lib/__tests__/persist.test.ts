import { describe, expect, it, beforeEach } from 'vitest'
import { CalcEngine } from '../engine.ts'
import {
  applyPersistState,
  capturePersistState,
  type PersistState,
} from '../persist.ts'
import { Dimension } from '../dimension.ts'

describe('persist snapshot', () => {
  beforeEach(() => {
    // no-op: persist helpers are pure when not touching localStorage
  })

  it('round-trips program, mode, memory, triangle, roof, stairs', () => {
    const eng = new CalcEngine()
    eng.setProgram('roof')
    eng.setMode('INCH')
    eng.inputDigit(6)
    eng.memoryStore(0)
    eng.clearEntry()
    eng.inputDigit(1)
    eng.inputDigit(2)
    eng.memoryStore(2)

    eng.setProgram('triangle')
    eng.setMode('INCH')
    eng.inputDigit(3)
    eng.handleProgramFn('rise')
    eng.inputDigit(4)
    eng.handleProgramFn('run')

    eng.setProgram('stairs')
    const bags = eng.getBags()
    bags.stairs.riserH = Dimension.fromInches(7)
    bags.stairs.steps = 14
    bags.roof.pitch = 6
    bags.roof.pitch2 = 8
    bags.roof.jackSide = 2

    const snap = capturePersistState(eng)
    expect(snap.v).toBe(1)
    expect(snap.memoriesInches[0]).toBe(6)
    expect(snap.memoriesInches[2]).toBe(12)
    expect(snap.triangle?.riseIn).toBe(3)
    expect(snap.triangle?.runIn).toBe(4)
    expect(snap.stairs?.riserHIn).toBe(7)
    expect(snap.roof?.pitch2).toBe(8)
    expect(snap.roof?.jackSide).toBe(2)

    const eng2 = new CalcEngine()
    applyPersistState(eng2, snap as PersistState)
    expect(eng2.program).toBe('stairs')
    expect(eng2.getSnapshot().mode).toBe('INCH')
    expect(eng2.getMemoryBank().get(0)?.toInches()).toBe(6)
    expect(eng2.getMemoryBank().get(2)?.toInches()).toBe(12)
    expect(eng2.getTriangle().rise?.toInches()).toBe(3)
    expect(eng2.getBags().roof.pitch2).toBe(8)
    expect(eng2.getBags().roof.jackSide).toBe(2)
    expect(eng2.getBags().stairs.steps).toBe(14)
  })
})
