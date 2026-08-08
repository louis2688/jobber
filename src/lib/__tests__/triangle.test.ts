import { describe, expect, it } from 'vitest'
import { Dimension } from '../dimension.ts'
import { solveTriangle } from '../triangle.ts'

describe('TriangleSolver', () => {
  it('solves 3-4-5 from rise + run', () => {
    const t = solveTriangle({
      rise: Dimension.fromInches(3),
      run: Dimension.fromInches(4),
    })
    expect(t.slope!.toInches()).toBeCloseTo(5, 8)
    expect(t.pitch).toBeCloseTo(9, 8) // 3/4 * 12 = 9
    expect(t.areaSqIn).toBeCloseTo(6, 8)
    expect(t.deg).toBeCloseTo((Math.atan(3 / 4) * 180) / Math.PI, 6)
  })

  it('solves 6/12 pitch with run', () => {
    const t = solveTriangle({
      run: Dimension.fromInches(12),
      pitch: 6,
    })
    expect(t.rise!.toInches()).toBeCloseTo(6, 8)
    expect(t.slope!.toInches()).toBeCloseTo(Math.sqrt(6 * 6 + 12 * 12), 8)
    expect(t.deg).toBeCloseTo((Math.atan(0.5) * 180) / Math.PI, 6)
  })

  it('solves from rise + slope', () => {
    const t = solveTriangle({
      rise: Dimension.fromInches(3),
      slope: Dimension.fromInches(5),
    })
    expect(t.run!.toInches()).toBeCloseTo(4, 8)
  })

  it('solves from slope + deg (45°)', () => {
    const hyp = 10
    const t = solveTriangle({
      slope: Dimension.fromInches(hyp),
      deg: 45,
    })
    expect(t.rise!.toInches()).toBeCloseTo(hyp * Math.sin(Math.PI / 4), 6)
  })

  it('solves from pitch + slope', () => {
    const t = solveTriangle({
      pitch: 6,
      slope: Dimension.fromInches(Math.sqrt(36 + 144)), // rise6 run12
    })
    expect(t.run!.toInches()).toBeCloseTo(12, 6)
    expect(t.rise!.toInches()).toBeCloseTo(6, 6)
  })
})
