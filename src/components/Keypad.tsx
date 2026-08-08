export type KeyAction =
  | { type: 'digit'; n: number }
  | { type: 'op'; op: '+' | '-' | '*' | '/' }
  | { type: 'equals' }
  | { type: 'dot' }
  | { type: 'colon' }
  | { type: 'sign' }
  | { type: 'ce' }
  | { type: 'mode'; mode: 'FIS' | 'DEC' | 'INCH' | 'MET' }
  | { type: 'cycleMode' }
  | { type: 'memRecall' }
  | { type: 'memStore' }
  | { type: 'memClear' }
  | { type: 'tri'; field: 'rise' | 'run' | 'pitch' | 'slope' | 'deg' | 'area' }
  | { type: 'clrTri' }
  | { type: 'reTri' }
  | { type: 'help' }
  | { type: 'dmsin' }
  | { type: 'rem' }

type KeyTone = 'digit' | 'blue' | 'red' | 'yellow' | 'white'

interface KeyDef {
  id: string
  label: string
  tone: KeyTone
  action: KeyAction
}

/** Jobber demo-style 7×6 grid (row-major). */
const KEYS: KeyDef[] = [
  // Row 1
  { id: 'mode', label: 'mode', tone: 'white', action: { type: 'cycleMode' } },
  { id: 'mem', label: 'mem↑', tone: 'blue', action: { type: 'memStore' } },
  { id: '13', label: '13', tone: 'digit', action: { type: 'digit', n: 13 } },
  { id: '14', label: '14', tone: 'digit', action: { type: 'digit', n: 14 } },
  { id: '15', label: '15', tone: 'digit', action: { type: 'digit', n: 15 } },
  { id: 'dec', label: 'DEC', tone: 'red', action: { type: 'mode', mode: 'DEC' } },
  { id: 'fis', label: 'FIS', tone: 'red', action: { type: 'mode', mode: 'FIS' } },
  // Row 2
  { id: 'pitch', label: 'pitch', tone: 'yellow', action: { type: 'tri', field: 'pitch' } },
  { id: 'deg', label: 'DEG', tone: 'yellow', action: { type: 'tri', field: 'deg' } },
  { id: '10', label: '10', tone: 'digit', action: { type: 'digit', n: 10 } },
  { id: '11', label: '11', tone: 'digit', action: { type: 'digit', n: 11 } },
  { id: '12', label: '12', tone: 'digit', action: { type: 'digit', n: 12 } },
  { id: 'ce', label: 'CE/C', tone: 'blue', action: { type: 'ce' } },
  { id: 'inch', label: 'INCH', tone: 'red', action: { type: 'mode', mode: 'INCH' } },
  // Row 3
  { id: 'rise', label: 'Rise', tone: 'yellow', action: { type: 'tri', field: 'rise' } },
  { id: 'area', label: 'Area', tone: 'yellow', action: { type: 'tri', field: 'area' } },
  { id: '7', label: '7', tone: 'digit', action: { type: 'digit', n: 7 } },
  { id: '8', label: '8', tone: 'digit', action: { type: 'digit', n: 8 } },
  { id: '9', label: '9', tone: 'digit', action: { type: 'digit', n: 9 } },
  { id: 'arrow', label: '→', tone: 'blue', action: { type: 'colon' } },
  { id: 'met', label: 'MET', tone: 'red', action: { type: 'mode', mode: 'MET' } },
  // Row 4
  { id: 'run', label: 'Run', tone: 'yellow', action: { type: 'tri', field: 'run' } },
  { id: 'slp', label: 'SLP', tone: 'yellow', action: { type: 'tri', field: 'slope' } },
  { id: '4', label: '4', tone: 'digit', action: { type: 'digit', n: 4 } },
  { id: '5', label: '5', tone: 'digit', action: { type: 'digit', n: 5 } },
  { id: '6', label: '6', tone: 'digit', action: { type: 'digit', n: 6 } },
  { id: 'rem', label: 'rem', tone: 'blue', action: { type: 'rem' } },
  { id: 'sign', label: '+/−', tone: 'blue', action: { type: 'sign' } },
  // Row 5
  { id: 'dmsin', label: 'DMSin', tone: 'yellow', action: { type: 'dmsin' } },
  { id: 'retr', label: 'ReTR', tone: 'white', action: { type: 'reTri' } },
  { id: '1', label: '1', tone: 'digit', action: { type: 'digit', n: 1 } },
  { id: '2', label: '2', tone: 'digit', action: { type: 'digit', n: 2 } },
  { id: '3', label: '3', tone: 'digit', action: { type: 'digit', n: 3 } },
  { id: 'div', label: '/', tone: 'blue', action: { type: 'op', op: '/' } },
  { id: 'mul', label: 'X', tone: 'blue', action: { type: 'op', op: '*' } },
  // Row 6
  { id: 'help', label: 'Help', tone: 'white', action: { type: 'help' } },
  { id: 'clrtr', label: 'ClrTR', tone: 'white', action: { type: 'clrTri' } },
  { id: 'dot', label: '.', tone: 'digit', action: { type: 'dot' } },
  { id: '0', label: '0', tone: 'digit', action: { type: 'digit', n: 0 } },
  { id: 'add', label: '+', tone: 'blue', action: { type: 'op', op: '+' } },
  { id: 'sub', label: '−', tone: 'blue', action: { type: 'op', op: '-' } },
  { id: 'eq', label: '=', tone: 'blue', action: { type: 'equals' } },
]

interface KeypadProps {
  activeMode: 'FIS' | 'DEC' | 'INCH' | 'MET'
  onAction: (action: KeyAction) => void
}

export function Keypad({ activeMode, onAction }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Calculator keypad">
      {KEYS.map((key) => {
        const active =
          key.action.type === 'mode' && key.action.mode === activeMode
        return (
          <button
            key={key.id}
            type="button"
            className={`key key-${key.tone}${active ? ' active' : ''}`}
            onClick={() => onAction(key.action)}
          >
            {key.label}
          </button>
        )
      })}
    </div>
  )
}
