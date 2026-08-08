import { describe, expect, it } from 'vitest'
import { Dimension } from '../dimension.ts'
import { EntryBuffer, parseFisString } from '../parse.ts'

describe('Dimension FIS format/parse', () => {
  it('formats zero as Jobber FIS', () => {
    expect(Dimension.zero().format('FIS')).toBe('0 ft. : 0 : 0/16 inch')
  })

  it('round-trips 10 ft 6 in', () => {
    const d = Dimension.fromFis(10, 6, 0)
    expect(d.toInches()).toBe(126)
    expect(d.format('FIS')).toBe('10 ft. : 6 : 0/16 inch')
    expect(parseFisString('10 : 6 : 0/16').toInches()).toBe(126)
    expect(parseFisString('10 ft. : 6 : 0/16 inch').toInches()).toBe(126)
  })

  it('handles sixteenths and carry', () => {
    const d = Dimension.fromInches(12 + 1 + 8 / 16)
    expect(d.format('FIS')).toBe('1 ft. : 1 : 8/16 inch')
  })

  it('converts FIS to DEC INCH MET', () => {
    const d = Dimension.fromFis(2, 0, 0)
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
    expect(a.add(b).format('FIS')).toBe('1 ft. : 6 : 0/16 inch')
    expect(a.subtract(b).format('FIS')).toBe('0 ft. : 6 : 0/16 inch')
  })

  it('parses negative FIS strings', () => {
    const d = parseFisString('-1 : 2 : 8/16')
    expect(d.toInches()).toBeCloseTo(-(12 + 2 + 0.5), 8)
  })
})

describe('EntryBuffer FIS keypad (Jobber right-to-left shift)', () => {
  /**
   * Demo video + jt.js + jobberh.js:
   * Digits enter at 0/16 (right) and shift left into inches then feet.
   * Key sequence from video (repeated 9s):
   *   9 -> 0:0:9/16 -> 0:9:9/16 -> 9:9:9/16 -> 99:9:9/16
   */
  it('enters first digit at sixteenths (video: tap 9)', () => {
    const buf = new EntryBuffer('FIS')
    buf.inputDigit(9)
    expect(buf.formatDisplay()).toBe('0 ft. : 0 : 9/16 inch')
  })

  it('shifts 16ths to inches on second digit (video: 9, 9)', () => {
    const buf = new EntryBuffer('FIS')
    buf.inputDigit(9)
    buf.inputDigit(9)
    expect(buf.formatDisplay()).toBe('0 ft. : 9 : 9/16 inch')
  })

  it('shifts into feet on third+ digits (video: 9x4 -> 99:9:9)', () => {
    const buf = new EntryBuffer('FIS')
    for (const d of [9, 9, 9, 9]) buf.inputDigit(d)
    expect(buf.formatDisplay()).toBe('99 ft. : 9 : 9/16 inch')
  })

  it('builds 10 ft 5 in 8/16 via 1058 (jobberh rem example)', () => {
    const buf = new EntryBuffer('FIS')
    const expected = [
      '0 ft. : 0 : 1/16 inch',
      '0 ft. : 1 : 0/16 inch',
      '1 ft. : 0 : 5/16 inch',
      '10 ft. : 5 : 8/16 inch',
    ]
    ;[1, 0, 5, 8].forEach((d, i) => {
      buf.inputDigit(d)
      expect(buf.formatDisplay()).toBe(expected[i])
    })
    expect(buf.toDimension().toInches()).toBeCloseTo(10 * 12 + 5 + 8 / 16, 8)
  })

  it('builds 10 ft 6 in via 1060 (no colon)', () => {
    const buf = new EntryBuffer('FIS')
    for (const d of [1, 0, 6, 0]) buf.inputDigit(d)
    expect(buf.formatDisplay()).toBe('10 ft. : 6 : 0/16 inch')
    expect(buf.toDimension().toInches()).toBe(126)
  })

  it('builds 1 ft 6 in via 160', () => {
    const buf = new EntryBuffer('FIS')
    for (const d of [1, 6, 0]) buf.inputDigit(d)
    expect(buf.formatDisplay()).toBe('1 ft. : 6 : 0/16 inch')
    expect(buf.toDimension().toInches()).toBe(18)
  })

  it('help example: 1:0:0 then tap 1 -> 10:0:1', () => {
    const buf = new EntryBuffer('FIS')
    for (const d of [1, 0, 0]) buf.inputDigit(d) // 1 ft. : 0 : 0/16
    expect(buf.formatDisplay()).toBe('1 ft. : 0 : 0/16 inch')
    buf.inputDigit(1)
    expect(buf.formatDisplay()).toBe('10 ft. : 0 : 1/16 inch')
  })

  it('accepts 10-15 keys into sixteenths', () => {
    const buf = new EntryBuffer('FIS')
    buf.inputDigit(15)
    expect(buf.formatDisplay()).toBe('0 ft. : 0 : 15/16 inch')
    expect(buf.toDimension().toInches()).toBeCloseTo(15 / 16, 8)
  })

  it('locks further digits after 12-15 (jt.js frac_set)', () => {
    const buf = new EntryBuffer('FIS')
    buf.inputDigit(12)
    expect(buf.formatDisplay()).toBe('0 ft. : 0 : 12/16 inch')
    buf.inputDigit(9)
    expect(buf.formatDisplay()).toBe('0 ft. : 0 : 12/16 inch')
  })
})
