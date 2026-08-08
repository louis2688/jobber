import { lazy, Suspense, useReducer, useState } from 'react'
import { Display } from './components/Display.tsx'
import { Keypad, type KeyAction } from './components/Keypad.tsx'
import { CalcEngine } from './lib/engine.ts'
import { nextProgram, PROGRAM_TITLE, type CalcProgram } from './lib/programs.ts'
import './styles/calculator.css'

const ExportButton = lazy(() =>
  import('./components/ExportButton.tsx').then((m) => ({
    default: m.ExportButton,
  })),
)

function createEngine() {
  return new CalcEngine()
}

type State = { engine: CalcEngine; tick: number; program: CalcProgram }

function reducer(state: State, action: KeyAction): State {
  const engine = state.engine
  let program = state.program

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
    case 'cycleProgram':
      program = nextProgram(program)
      engine.setProgram(program)
      break
    case 'memRecall':
      engine.memoryRecall(action.slot)
      break
    case 'memStore':
      engine.memoryStore(action.slot)
      break
    case 'memClear':
      engine.memoryClear()
      break
    case 'fn':
      engine.handleProgramFn(action.id)
      break
    case 'tri':
    case 'clrTri':
    case 'reTri':
    case 'dmsin':
    case 'help':
      break
    case 'rem':
      engine.remainderHint()
      break
  }
  return { engine, program, tick: state.tick + 1 }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    engine: createEngine(),
    program: 'triangle' as CalcProgram,
    tick: 0,
  }))
  const [helpOpen, setHelpOpen] = useState(false)
  const snap = state.engine.getSnapshot()

  return (
    <div className="app-shell">
      <div className="calc-device">
        <Display
          value={snap.display}
          unitMode={snap.mode}
          program={state.program}
          memories={snap.memories}
          activeMemorySlot={snap.activeMemorySlot}
          error={snap.error}
          dmsDisplay={snap.dmsDisplay}
          onClearMem={() => dispatch({ type: 'memClear' })}
          onRecallMem={(slot) => dispatch({ type: 'memRecall', slot })}
          onStoreMem={(slot) => {
            state.engine.selectMemorySlot(slot)
            dispatch({ type: 'memStore', slot })
          }}
        />
        <Keypad
          program={state.program}
          activeUnit={snap.mode}
          onAction={(action) => {
            if (
              action.type === 'fn' &&
              action.id === 'help' &&
              state.program === 'triangle'
            ) {
              setHelpOpen(true)
              return
            }
            if (action.type === 'memStore' && action.slot == null) {
              dispatch({ type: 'memStore', slot: snap.activeMemorySlot })
              return
            }
            dispatch(action)
          }}
        />
      </div>

      <div className="fab-export">
        <Suspense fallback={null}>
          <ExportButton
            payload={{
              display: snap.display,
              mode: snap.mode,
              memory: snap.memory,
              tape: snap.tape,
              triangle: snap.triangle,
            }}
          />
        </Suspense>
      </div>

      {helpOpen ? (
        <div className="help-overlay" role="dialog" aria-modal="true">
          <div className="help-card">
            <h2>Help — 6 modes</h2>
            <p>
              Press white <b>mode</b> (top-left) to cycle:
            </p>
            <ul>
              {Object.values(PROGRAM_TITLE).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p>
              Memory: tap a blue/dark cell to recall that slot. Right-click (or
              long-press) a cell to store. <b>MEM↓</b> stores into the active slot.
            </p>
            <p>
              DMSin: enter <b>DD.MMSS</b> (e.g. 45.3015 = 45°30′15″) or use DEG,
              then press DMSin.
            </p>
            <p>
              Yellow keys change with each mode. Current:{' '}
              <b>{PROGRAM_TITLE[state.program]}</b>
            </p>
            <button type="button" onClick={() => setHelpOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
