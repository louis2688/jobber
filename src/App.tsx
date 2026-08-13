import { lazy, Suspense, useEffect, useReducer, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { Display } from './components/Display.tsx'
import { Keypad, type KeyAction } from './components/Keypad.tsx'
import { CalcEngine } from './lib/engine.ts'
import { nextProgram, PROGRAM_TITLE, type CalcProgram } from './lib/programs.ts'
import {
  applyPersistState,
  capturePersistState,
  loadPersistState,
  savePersistState,
} from './lib/persist.ts'
import './styles/calculator.css'

const ExportButton = lazy(() =>
  import('./components/ExportButton.tsx').then((m) => ({
    default: m.ExportButton,
  })),
)

function createEngine() {
  const engine = new CalcEngine()
  const saved = typeof localStorage !== 'undefined' ? loadPersistState() : null
  if (saved) {
    try {
      applyPersistState(engine, saved)
    } catch {
      // corrupt persist blob — start fresh
    }
  }
  return engine
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
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const engine = createEngine()
    return {
      engine,
      program: engine.program,
      tick: 0,
    }
  })
  const [helpOpen, setHelpOpen] = useState(false)
  const snap = state.engine.getSnapshot()

  useEffect(() => {
    savePersistState(capturePersistState(state.engine))
  }, [state.tick, state.engine, state.program])

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

      <footer className="app-footer">
        <a href="/docs/CHEATSHEET.md" target="_blank" rel="noreferrer">
          Field cheat sheet
        </a>
        <span aria-hidden="true">·</span>
        <a href="/Jobber-Calculator.xml" download="Jobber-Calculator.xml">
          Excel add-in
        </a>
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/louis2688/jobber"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </footer>

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
            <p>
              Field steps:{' '}
              <a href="/docs/CHEATSHEET.md" target="_blank" rel="noreferrer">
                cheat sheet
              </a>
            </p>
            <button type="button" onClick={() => setHelpOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {/* First-party / privacy-light — main web app only, not Excel iframe */}
      <Analytics />
    </div>
  )
}
