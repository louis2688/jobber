import { StrictMode, useEffect, useReducer, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalcEngine } from '@lib/engine.ts'
import { nextProgram, PROGRAM_TITLE, type CalcProgram } from '@lib/programs.ts'
import { FN_LABELS, type FnKeyId } from '@lib/programs.ts'
import './taskpane.css'

declare const Office: typeof globalThis extends { Office: infer O } ? O : any

type Action =
  | { type: 'digit'; n: number }
  | { type: 'op'; op: '+' | '-' | '*' | '/' }
  | { type: 'equals' }
  | { type: 'dot' }
  | { type: 'colon' }
  | { type: 'ce' }
  | { type: 'unit'; mode: 'FIS' | 'DEC' | 'INCH' | 'MET' }
  | { type: 'cycle' }
  | { type: 'fn'; id: FnKeyId }
  | { type: 'tick' }

function reducer(
  state: { engine: CalcEngine; program: CalcProgram; tick: number },
  action: Action,
) {
  const { engine } = state
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
    case 'ce':
      engine.clearEntry()
      break
    case 'unit':
      engine.setMode(action.mode)
      break
    case 'cycle':
      program = nextProgram(program)
      engine.setProgram(program)
      break
    case 'fn':
      engine.handleProgramFn(action.id)
      break
    case 'tick':
      break
  }
  return { engine, program, tick: state.tick + 1 }
}

async function insertValue(text: string): Promise<string> {
  if (typeof Office === 'undefined' || !Office.context?.document) {
    return 'Office not available — open inside Excel task pane'
  }
  return new Promise((resolve) => {
    Excel.run(async (context) => {
      const range = context.workbook.getActiveCell()
      range.values = [[text]]
      await context.sync()
      resolve(`Inserted into active cell`)
    }).catch((err: Error) => resolve(err.message || 'Insert failed'))
  })
}

function dimLabel(
  dim: { format: (mode: 'FIS' | 'DEC' | 'INCH' | 'MET') => string } | null,
  mode: 'FIS' | 'DEC' | 'INCH' | 'MET',
): string {
  return dim ? dim.format(mode) : ''
}

/** Build a small table: summary + triangle + recent tape. */
function buildInsertTable(
  snap: ReturnType<CalcEngine['getSnapshot']>,
  program: CalcProgram,
): string[][] {
  const rows: string[][] = [
    ['Jobber Calc', PROGRAM_TITLE[program]],
    ['Value', snap.display],
    ['Unit', snap.mode],
    ['Memory', snap.memory ?? ''],
    ['', ''],
    ['Triangle', ''],
    ['Rise', dimLabel(snap.triangle.rise, snap.mode)],
    ['Run', dimLabel(snap.triangle.run, snap.mode)],
    ['Slope', dimLabel(snap.triangle.slope, snap.mode)],
    [
      'Pitch',
      snap.triangle.pitch != null ? `${snap.triangle.pitch.toFixed(4)}/12` : '',
    ],
    [
      'DEG',
      snap.triangle.deg != null ? snap.triangle.deg.toFixed(4) : '',
    ],
    ['', ''],
    ['Tape', ''],
  ]
  const tape = snap.tape.slice(0, 12)
  if (tape.length === 0) {
    rows.push(['(empty)', ''])
  } else {
    for (const entry of tape) {
      rows.push([entry.text, ''])
    }
  }
  return rows
}

async function insertTable(
  snap: ReturnType<CalcEngine['getSnapshot']>,
  program: CalcProgram,
): Promise<string> {
  if (typeof Office === 'undefined' || !Office.context?.document) {
    return 'Office not available — open inside Excel task pane'
  }
  const values = buildInsertTable(snap, program)
  return new Promise((resolve) => {
    Excel.run(async (context) => {
      const start = context.workbook.getActiveCell()
      const range = start.getResizedRange(values.length - 1, 1)
      range.values = values
      range.format.autofitColumns()
      await context.sync()
      resolve(`Inserted ${values.length}×2 table at active cell`)
    }).catch((err: Error) => resolve(err.message || 'Insert table failed'))
  })
}

function TaskPane() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    engine: new CalcEngine(),
    program: 'triangle' as CalcProgram,
    tick: 0,
  }))
  const [status, setStatus] = useState('Ready')
  const [officeReady, setOfficeReady] = useState(false)
  const snap = state.engine.getSnapshot()

  useEffect(() => {
    const boot = () => setOfficeReady(true)
    if (typeof Office !== 'undefined' && Office.onReady) {
      Office.onReady().then(boot).catch(boot)
    } else {
      setOfficeReady(false)
      setStatus('Preview mode (not inside Excel)')
    }
  }, [])

  const fnKeys: FnKeyId[] = [
    'pitch',
    'deg',
    'rise',
    'area',
    'run',
    'slp',
    'dmsin',
    'retr',
    'help',
    'clrtr',
  ]

  return (
    <div className="pane">
      <header>
        <h1>Jobber Calc</h1>
        <button type="button" className="mode-btn" onClick={() => dispatch({ type: 'cycle' })}>
          {PROGRAM_TITLE[state.program]}
        </button>
      </header>

      <div className="display">{snap.error ?? snap.display}</div>
      <div className="unit-row">
        {(['FIS', 'DEC', 'INCH', 'MET'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={snap.mode === m ? 'active' : ''}
            onClick={() => dispatch({ type: 'unit', mode: m })}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="fn-grid">
        {fnKeys.map((id) => (
          <button key={id} type="button" onClick={() => dispatch({ type: 'fn', id })}>
            {FN_LABELS[id][state.program]}
          </button>
        ))}
      </div>

      <div className="pad">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
          <button key={n} type="button" onClick={() => dispatch({ type: 'digit', n })}>
            {n}
          </button>
        ))}
        <button type="button" onClick={() => dispatch({ type: 'dot' })}>
          .
        </button>
        <button type="button" onClick={() => dispatch({ type: 'digit', n: 0 })}>
          0
        </button>
        <button type="button" onClick={() => dispatch({ type: 'colon' })}>
          →
        </button>
      </div>

      <div className="ops">
        {(['+', '-', '*', '/'] as const).map((op) => (
          <button key={op} type="button" onClick={() => dispatch({ type: 'op', op })}>
            {op === '*' ? '×' : op}
          </button>
        ))}
        <button type="button" onClick={() => dispatch({ type: 'equals' })}>
          =
        </button>
        <button type="button" onClick={() => dispatch({ type: 'ce' })}>
          CE/C
        </button>
      </div>

      <div className="insert-row">
        <button
          type="button"
          className="insert"
          disabled={!officeReady && typeof Office === 'undefined'}
          onClick={async () => {
            const msg = await insertValue(snap.display)
            setStatus(msg)
          }}
        >
          Insert value
        </button>
        <button
          type="button"
          className="insert insert-table"
          disabled={!officeReady && typeof Office === 'undefined'}
          onClick={async () => {
            const msg = await insertTable(snap, state.program)
            setStatus(msg)
          }}
        >
          Insert table
        </button>
      </div>
      <p className="status">{status}</p>
      <p className="hint">Math shared from <code>src/lib</code> via Vite alias.</p>
    </div>
  )
}

const el = document.getElementById('root')!
createRoot(el).render(
  <StrictMode>
    <TaskPane />
  </StrictMode>,
)
