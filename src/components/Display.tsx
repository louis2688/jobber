import type { DisplayMode } from '../lib/dimension.ts'
import type { TriangleState } from '../lib/triangle.ts'
import { formatPitch } from '../lib/triangle.ts'

interface DisplayProps {
  value: string
  mode: DisplayMode
  memory: string | null
  triangle: TriangleState
  error: string | null
  onClearMem: () => void
  onRecallMem: () => void
}

function dimText(dim: { format(mode: DisplayMode): string } | null | undefined, mode: DisplayMode, fallback: string) {
  return dim ? dim.format(mode) : fallback
}

export function Display({
  value,
  mode,
  memory,
  triangle,
  error,
  onClearMem,
  onRecallMem,
}: DisplayProps) {
  const memLabel = memory ?? '0'
  const secondary =
    triangle.rise && triangle.run
      ? dimText(triangle.slope, mode, value)
      : value
  const tertiary =
    triangle.pitch != null ? formatPitch(triangle.pitch) : value

  return (
    <>
      <div className="mode-bar">
        <span>Right Triangle</span>
        <span className="mode-bar-count">{mode === 'FIS' ? '0' : mode}</span>
      </div>
      <div className="display-stack" data-error={error ? 'true' : 'false'}>
        <button type="button" className="disp-cell disp-blue" title="Memory (tap to recall)" onClick={onRecallMem}>
          <span className="disp-value">{memLabel}</span>
          <span className="disp-icon" aria-hidden>
            ▲
          </span>
        </button>
        <div className="disp-cell disp-dark" title="Display">
          <span className="disp-value disp-main">{error ?? value}</span>
          <span className="disp-icon" aria-hidden>
            ▼
          </span>
        </div>
        <div className="disp-cell disp-dark" title="Secondary">
          <span className="disp-value">{secondary}</span>
          <span className="disp-icon" aria-hidden>
            ▼
          </span>
        </div>

        <div className="disp-cell disp-blue" title="Working value">
          <span className="disp-value">{error ? '0' : value}</span>
          <span className="disp-icon" aria-hidden>
            ▲
          </span>
        </div>
        <div className="disp-cell disp-dark" title="Pitch / tertiary">
          <span className="disp-value">{tertiary}</span>
          <span className="disp-icon" aria-hidden>
            ▼
          </span>
        </div>
        <button type="button" className="clear-mem" onClick={onClearMem}>
          clear mem
          <span aria-hidden>×</span>
        </button>
      </div>
    </>
  )
}
