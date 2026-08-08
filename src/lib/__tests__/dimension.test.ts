import { describe, expect, it } from 'vitest'
import { Dimension } from '../dimension.ts'
import { EntryBuffer, parseFisString } from '../parse.ts'

describe('Dimension FIS format/parse', () => {
  it('formats zero as 0 : 0 : 0/16', () => {
    expect(Dimension.zero().format('FIS')).toBe('0 : 0 : 0/16')
  })

  it('round-trips 10 ft 6 in', () => {
    const d = Dimension.fromFis(10, 6, 0)
    expect(d.toInches()).toBe(126)
    expect(d.format('FIS')).toBe('10 : 6 : 0/16')
    expect(parseFisString('10 : 6 : 0/16').toInches()).toBe(126)
  })

  it('handles sixteenths and carry', () => {
    const d = Dimension.fromInches(12 + 1 + 8 / 16) // 1' 1-8/16"
    expect(d.format('FIS')).toBe('1 : 1 : 8/16')
  })

  it('converts FIS ↔ DEC ↔ INCH ↔ MET', () => {
    const d = Dimension.fromFis(2, 0, 0) // 24"
    expect(d.toFeet()).toBe(2)
    expect(d.toInches()).toBe(24)
    expect(d.toMm()).toBeCloseTo(609.6, 5)
    expect(d.format('DEC')).toContain('2')
    expect(d.format('INCH')).toContain('24')
    expect(d.format('MET')).toContain('609.6')
  })

  it('adds and subtracts across units', () => {
    const a = Dimension.fromFis(1, 0, 0)
    const b = Dimension.fromInches(6)
    expect(a.add(b).format('FIS')).toBe('1 : 6 : 0/16')
    expect(a.subtract(b).format('FIS')).toBe('0 : 6 : 0/16')
  })

  it('parses negative FIS strings', () => {
    const d = parseFisString('-1 : 2 : 8/16')
    expect(d.toInches()).toBeCloseTo(-(12 + 2 + 0.5), 8)
  })
})

describe('EntryBuffer FIS keypad', () => {
  it('builds 10 : 6 : 0/16 via digits and colon', () => {
    const buf = new EntryBuffer('FIS')
    buf.inputDigit(1)
    buf.inputDigit(0)
    buf.advanceSegment()
    buf.inputDigit(6)
    expect(buf.formatDisplay()).toBe('10 : 6 : 0/16')
    expect(buf.toDimension().toInches()).toBe(126)
  })

  it('accepts 10–15 keys for sixteenths', () => {
    const buf = new EntryBuffer('FIS')
    buf.inputDigit(0)
    buf.advanceSegment()
    buf.inputDigit(0)
    buf.advanceSegment()
    buf.inputDigit(15)
    expect(buf.formatDisplay()).toBe('0 : 0 : 15/16')
  })
})
