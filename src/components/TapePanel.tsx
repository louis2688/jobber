import type { TapeEntry } from '../lib/engine.ts'
import {
  formatArea,
  formatDeg,
  formatPitch,
  type TriangleState,
} from '../lib/triangle.ts'
import type { DisplayMode } from '../lib/dimension.ts'

interface TapePanelProps {
  tape: TapeEntry[]
  triangle: TriangleState
  mode: DisplayMode
  onClearTape: () => void
}

export function TapePanel({ tape, triangle, mode, onClearTape }: TapePanelProps) {
  const rise = triangle.rise ? triangle.rise.format(mode) : '—'
  const run = triangle.run ? triangle.run.format(mode) : '—'
  const slope = triangle.slope ? triangle.slope.format(mode) : '—'

  return (
    <aside className="tape-panel">
      <div className="panel-header">
        <h2>Paperless Tape</h2>
        <button type="button" className="linkish" onClick={onClearTape}>
          Clear
        </button>
      </div>
      <ol className="tape-list">
        {tape.length === 0 ? (
          <li className="tape-empty">No entries yet</li>
        ) : (
          tape.map((entry) => (
            <li key={entry.id}>{entry.text}</li>
          ))
        )}
      </ol>

      <div className="triangle-box">
        <h2>Triangle</h2>
        <dl>
          <div><dt>Rise</dt><dd>{rise}</dd></div>
          <div><dt>Run</dt><dd>{run}</dd></div>
          <div><dt>Pitch</dt><dd>{formatPitch(triangle.pitch)}</dd></div>
          <div><dt>Slope</dt><dd>{slope}</dd></div>
          <div><dt>Deg</dt><dd>{formatDeg(triangle.deg)}</dd></div>
          <div><dt>Area</dt><dd>{formatArea(triangle.areaSqIn, 'sqft')}</dd></div>
        </dl>
      </div>
    </aside>
  )
}
