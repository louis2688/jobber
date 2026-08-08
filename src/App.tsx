import { useReducer, useState } from 'react'
import { Display } from './components/Display.tsx'
import { ExportButton } from './components/ExportButton.tsx'
import { Keypad, type KeyAction } from './components/Keypad.tsx'
import { CalcEngine } from './lib/engine.ts'
import { nextProgram, PROGRAM_TITLE, type CalcProgram } from './lib/programs.ts'
import './styles/calculator.css'

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
      engine.memoryRecall()
      break
    case 'memStore':
      engine.memoryStore()
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
      // legacy paths — Keypad now sends fn
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
          memory={snap.memory}
          error={snap.error}
          onClearMem={() => dispatch({ type: 'memClear' })}
          onRecallMem={() => dispatch({ type: 'memRecall' })}
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
            dispatch(action)
          }}
        />
      </div>

      <div className="fab-export">
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
            <p>Yellow keys change with each mode. Current: <b>{PROGRAM_TITLE[state.program]}</b></p>
            <button type="button" onClick={() => setHelpOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
