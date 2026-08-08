import type { DisplayMode } from '../lib/dimension.ts'
import { PROGRAM_TITLE, type CalcProgram } from '../lib/programs.ts'

interface DisplayProps {
  value: string
  unitMode: DisplayMode
  program: CalcProgram
  memories: (string | null)[]
  activeMemorySlot: number
  error: string | null
  dmsDisplay?: string | null
  onClearMem: () => void
  onRecallMem: (slot: number) => void
  onStoreMem: (slot: number) => void
}

/** Jobber mem layout: blue store/recall cells + dark secondary cells + clear. */
const SLOT_TONES: Array<'blue' | 'dark'> = ['blue', 'dark', 'dark', 'blue', 'dark']

export function Display({
  value,
  unitMode: _unitMode,
  program,
  memories,
  activeMemorySlot,
  error,
  dmsDisplay,
  onClearMem,
  onRecallMem,
  onStoreMem,
}: DisplayProps) {
  void _unitMode
  const main = error ?? value

  return (
    <>
      <div className="mode-bar">
        <div className="mode-bar-cell">{PROGRAM_TITLE[program]}</div>
        <div className="mode-bar-cell right disp-main">
          <span className="disp-main-value">{main}</span>
          {dmsDisplay && !error ? (
            <span className="disp-dms" title="Degrees ° Minutes ′ Seconds ″">
              {dmsDisplay}
            </span>
          ) : null}
        </div>
      </div>
      <div className="display-stack" data-error={error ? 'true' : 'false'}>
        {SLOT_TONES.map((tone, slot) => {
          const label = memories[slot] ?? '0'
          const active = activeMemorySlot === slot
          return (
            <button
              key={slot}
              type="button"
              className={`disp-cell disp-${tone}${active ? ' disp-active' : ''}`}
              title={`Memory ${slot + 1}: tap recall, long-press not needed — MEM↓ stores active`}
              onClick={() => onRecallMem(slot)}
              onContextMenu={(e) => {
                e.preventDefault()
                onStoreMem(slot)
              }}
            >
              <span className="disp-value">{label}</span>
              <span className="disp-icon" aria-hidden>
                {tone === 'blue' ? '▲' : '▼'}
              </span>
            </button>
          )
        })}
        <button type="button" className="clear-mem" onClick={onClearMem}>
          clear mem
          <span aria-hidden>×</span>
        </button>
      </div>
    </>
  )
}

export type { CalcProgram }
