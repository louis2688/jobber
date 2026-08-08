import type { DisplayMode } from '../lib/dimension.ts'
import { PROGRAM_TITLE, type CalcProgram } from '../lib/programs.ts'

interface DisplayProps {
  value: string
  unitMode: DisplayMode
  program: CalcProgram
  memory: string | null
  error: string | null
  onClearMem: () => void
  onRecallMem: () => void
}

export function Display({
  value,
  unitMode,
  program,
  memory,
  error,
  onClearMem,
  onRecallMem,
}: DisplayProps) {
  const main = error ?? value
  const zeroFis =
    unitMode === 'FIS' ? '0 ft. : 0 : 0/16 inch' : main
  const memShown = memory ?? '0'

  return (
    <>
      <div className="mode-bar">
        <div className="mode-bar-cell">{PROGRAM_TITLE[program]}</div>
        <div className="mode-bar-cell right disp-main">{main}</div>
      </div>
      <div className="display-stack" data-error={error ? 'true' : 'false'}>
        <button type="button" className="disp-cell disp-blue" onClick={onRecallMem}>
          <span className="disp-value">{memShown}</span>
          <span className="disp-icon" aria-hidden>▲</span>
        </button>
        <div className="disp-cell disp-dark">
          <span className="disp-value">{zeroFis}</span>
          <span className="disp-icon" aria-hidden>▼</span>
        </div>
        <div className="disp-cell disp-dark">
          <span className="disp-value">{zeroFis}</span>
          <span className="disp-icon" aria-hidden>▼</span>
        </div>
        <button type="button" className="disp-cell disp-blue" onClick={onRecallMem}>
          <span className="disp-value">{memory ? memShown : '0'}</span>
          <span className="disp-icon" aria-hidden>▲</span>
        </button>
        <div className="disp-cell disp-dark">
          <span className="disp-value">{zeroFis}</span>
          <span className="disp-icon" aria-hidden>▼</span>
        </div>
        <button type="button" className="clear-mem" onClick={onClearMem}>
          clear mem
          <span aria-hidden>×</span>
        </button>
      </div>
    </>
  )
}

export type { CalcProgram }
