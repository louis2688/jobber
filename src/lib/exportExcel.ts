import * as XLSX from 'xlsx'
import type { DisplayMode } from './dimension.ts'
import type { TapeEntry } from './engine.ts'
import {
  formatArea,
  formatDeg,
  formatPitch,
  type TriangleState,
} from './triangle.ts'

export interface ExportPayload {
  display: string
  mode: DisplayMode
  memory: string | null
  tape: TapeEntry[]
  triangle: TriangleState
}

/**
 * Build and download a .xlsx workbook with current value, tape, and triangle.
 */
export function exportToExcel(payload: ExportPayload, filename = 'jobber-calc.xlsx'): void {
  const wb = XLSX.utils.book_new()

  const riseText = payload.triangle.rise
    ? payload.triangle.rise.format(payload.mode)
    : ''
  const runText = payload.triangle.run
    ? payload.triangle.run.format(payload.mode)
    : ''
  const slopeText = payload.triangle.slope
    ? payload.triangle.slope.format(payload.mode)
    : ''

  const summaryRows: (string | number)[][] = [
    ['Jobber Construction Calculator Export'],
    [],
    ['Current Value', payload.display],
    ['Mode', payload.mode],
    ['Memory', payload.memory ?? ''],
    [],
    ['Triangle'],
    ['Rise', riseText],
    ['Run', runText],
    ['Pitch', formatPitch(payload.triangle.pitch)],
    ['Slope', slopeText],
    ['Degrees', formatDeg(payload.triangle.deg)],
    ['Area', formatArea(payload.triangle.areaSqIn, 'sqft')],
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Results')

  const tapeRows: (string | number)[][] = [['#', 'Entry']]
  const chronological = [...payload.tape].reverse()
  chronological.forEach((entry, i) => {
    tapeRows.push([i + 1, entry.text])
  })
  if (chronological.length === 0) {
    tapeRows.push(['', '(empty)'])
  }

  const tapeSheet = XLSX.utils.aoa_to_sheet(tapeRows)
  XLSX.utils.book_append_sheet(wb, tapeSheet, 'Tape')

  XLSX.writeFile(wb, filename)
}
