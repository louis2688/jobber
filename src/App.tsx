import { useReducer, useState } from 'react'
import { Display } from './components/Display.tsx'
import { ExportButton } from './components/ExportButton.tsx'
import { Keypad, type KeyAction } from './components/Keypad.tsx'
import {
  formatArea,
  formatDeg,
  formatPitch,
} from './lib/triangle.ts'
import type { DisplayMode } from './lib/dimension.ts'
import { CalcEngine } from './lib/engine.ts'
import './styles/calculator.css'

function createEngine() {
  return new CalcEngine()
}

type State = { engine: CalcEngine; tick: number }

function reducer(state: State, action: KeyAction | { type: 'clearTape' }): State {
  const engine = state.engine
  switch (action.type) {
    case 'digit':
      engine.inputDigit(action.n)
      break
    case 'op':
      engine.setOperator(action.op)
      break
    case 'equals':
      engine.equals()
      break
    case 'dot':
      engine.inputDecimalPoint()
      break
    case 'colon':
      engine.advanceFisSegment()
      break
    case 'sign':
      engine.toggleSign()
      break
    case 'ce':
      engine.clearEntry()
      break
    case 'mode':
      engine.setMode(action.mode)
      break
    case 'cycleMode':
      engine.cycleMode()
      break
    case 'memRecall':
      engine.memoryRecall()
      break
    case 'memStore':
      engine.memoryStore()
      break
    case 'memClear':
      engine.memoryClear()
      break
    case 'tri':
      if (action.field === 'area') {
        engine.showTriangleField('area')
      } else {
        engine.setTriangleField(action.field)
      }
      break
    case 'clrTri':
      engine.clearTriangle()
      break
    case 'reTri':
      engine.recallTriangle()
      break
    case 'rem':
      engine.remainderHint()
      break
    case 'dmsin':
      engine.dmsinHint()
      break
    case 'help':
      break
    case 'clearTape':
      engine.clearTape()
      break
  }
  return { engine, tick: state.tick + 1 }
}

function fmtDim(dim: { format(mode: DisplayMode): string } | null, snapMode: DisplayMode) {
  return dim ? dim.format(snapMode) : '—'
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    engine: createEngine(),
    tick: 0,
  }))
  const [helpOpen, setHelpOpen] = useState(false)

  const snap = state.engine.getSnapshot()
  const t = snap.triangle
  const mode = snap.mode

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <ExportButton
          payload={{
            display: snap.display,
            mode: snap.mode,
            memory: snap.memory,
            tape: snap.tape,
            triangle: snap.triangle,
          }}
        />
      </div>

      <div className="calc-device">
        <Display
          value={snap.display}
          mode={snap.mode}
          memory={snap.memory}
          triangle={snap.triangle}
          error={snap.error}
          onClearMem={() => dispatch({ type: 'memClear' })}
          onRecallMem={() => dispatch({ type: 'memRecall' })}
        />
        <Keypad
          activeMode={snap.mode}
          onAction={(action) => {
            if (action.type === 'help') {
              setHelpOpen(true)
              return
            }
            dispatch(action)
          }}
        />
      </div>

      <details className="tape-drawer">
        <summary>Tape &amp; triangle details</summary>
        <ol className="tape-list">
          {snap.tape.length === 0 ? (
            <li>No entries yet</li>
          ) : (
            snap.tape.map((entry) => <li key={entry.id}>{entry.text}</li>)
          )}
        </ol>
        <div className="triangle-inline">
          <span>Rise {fmtDim(t.rise, mode)}</span>
          <span>Run {fmtDim(t.run, mode)}</span>
          <span>Pitch {formatPitch(t.pitch)}</span>
          <span>SLP {fmtDim(t.slope, mode)}</span>
          <span>Deg {formatDeg(t.deg)}</span>
          <span>Area {formatArea(t.areaSqIn, 'sqft')}</span>
        </div>
      </details>

      {helpOpen ? (
        <div className="help-overlay" role="dialog" aria-modal="true">
          <div className="help-card">
            <h2>Help</h2>
            <p>FIS entry (feet : inches : /16):</p>
            <ul>
              <li>Enter feet, press →, enter inches, press →, enter sixteenths</li>
              <li>Use digits 10–15 for inches/fractions in one tap</li>
              <li>Enter any two of Rise / Run / Pitch / SLP / DEG to solve</li>
              <li>mem↑ stores; press again to recall. clear mem wipes memory</li>
              <li>Export Excel (top right) downloads results as .xlsx</li>
            </ul>
            <button type="button" onClick={() => setHelpOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
