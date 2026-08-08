import {
  FN_LABELS,
  fnTone,
  type CalcProgram,
  type FnKeyId,
} from '../lib/programs.ts'

export type KeyAction =
  | { type: 'digit'; n: number }
  | { type: 'op'; op: '+' | '-' | '*' | '/' }
  | { type: 'equals' }
  | { type: 'dot' }
  | { type: 'colon' }
  | { type: 'sign' }
  | { type: 'ce' }
  | { type: 'mode'; mode: 'FIS' | 'DEC' | 'INCH' | 'MET' }
  | { type: 'cycleProgram' }
  | { type: 'memRecall'; slot?: number }
  | { type: 'memStore'; slot?: number }
  | { type: 'memClear' }
  | { type: 'tri'; field: 'rise' | 'run' | 'pitch' | 'slope' | 'deg' | 'area' }
  | { type: 'clrTri' }
  | { type: 'reTri' }
  | { type: 'help' }
  | { type: 'dmsin' }
  | { type: 'rem' }
  | { type: 'fn'; id: FnKeyId }

type KeyTone = 'digit' | 'blue' | 'red' | 'yellow' | 'white'

interface KeyDef {
  id: string
  label: string | 'fn'
  fnId?: FnKeyId
  tone: KeyTone | 'fn'
  action: KeyAction
}

const KEYS: KeyDef[] = [
  { id: 'mode', label: 'mode', tone: 'white', action: { type: 'cycleProgram' } },
  { id: 'mem', label: 'MEM↓', tone: 'blue', action: { type: 'memStore' } },
  { id: '13', label: '13', tone: 'digit', action: { type: 'digit', n: 13 } },
  { id: '14', label: '14', tone: 'digit', action: { type: 'digit', n: 14 } },
  { id: '15', label: '15', tone: 'digit', action: { type: 'digit', n: 15 } },
  { id: 'dec', label: 'DEC', tone: 'red', action: { type: 'mode', mode: 'DEC' } },
  { id: 'fis', label: 'FIS', tone: 'red', action: { type: 'mode', mode: 'FIS' } },

  { id: 'pitch', label: 'fn', fnId: 'pitch', tone: 'fn', action: { type: 'fn', id: 'pitch' } },
  { id: 'deg', label: 'fn', fnId: 'deg', tone: 'fn', action: { type: 'fn', id: 'deg' } },
  { id: '10', label: '10', tone: 'digit', action: { type: 'digit', n: 10 } },
  { id: '11', label: '11', tone: 'digit', action: { type: 'digit', n: 11 } },
  { id: '12', label: '12', tone: 'digit', action: { type: 'digit', n: 12 } },
  { id: 'ce', label: 'CE/C', tone: 'blue', action: { type: 'ce' } },
  { id: 'inch', label: 'INCH', tone: 'red', action: { type: 'mode', mode: 'INCH' } },

  { id: 'rise', label: 'fn', fnId: 'rise', tone: 'fn', action: { type: 'fn', id: 'rise' } },
  { id: 'area', label: 'fn', fnId: 'area', tone: 'fn', action: { type: 'fn', id: 'area' } },
  { id: '7', label: '7', tone: 'digit', action: { type: 'digit', n: 7 } },
  { id: '8', label: '8', tone: 'digit', action: { type: 'digit', n: 8 } },
  { id: '9', label: '9', tone: 'digit', action: { type: 'digit', n: 9 } },
  { id: 'arrow', label: '→', tone: 'blue', action: { type: 'colon' } },
  { id: 'met', label: 'MET', tone: 'red', action: { type: 'mode', mode: 'MET' } },

  { id: 'run', label: 'fn', fnId: 'run', tone: 'fn', action: { type: 'fn', id: 'run' } },
  { id: 'slp', label: 'fn', fnId: 'slp', tone: 'fn', action: { type: 'fn', id: 'slp' } },
  { id: '4', label: '4', tone: 'digit', action: { type: 'digit', n: 4 } },
  { id: '5', label: '5', tone: 'digit', action: { type: 'digit', n: 5 } },
  { id: '6', label: '6', tone: 'digit', action: { type: 'digit', n: 6 } },
  { id: 'rem', label: 'rem', tone: 'blue', action: { type: 'rem' } },
  { id: 'sign', label: '+/−', tone: 'blue', action: { type: 'sign' } },

  { id: 'dmsin', label: 'fn', fnId: 'dmsin', tone: 'fn', action: { type: 'fn', id: 'dmsin' } },
  { id: 'retr', label: 'fn', fnId: 'retr', tone: 'fn', action: { type: 'fn', id: 'retr' } },
  { id: '1', label: '1', tone: 'digit', action: { type: 'digit', n: 1 } },
  { id: '2', label: '2', tone: 'digit', action: { type: 'digit', n: 2 } },
  { id: '3', label: '3', tone: 'digit', action: { type: 'digit', n: 3 } },
  { id: 'div', label: '/', tone: 'blue', action: { type: 'op', op: '/' } },
  { id: 'mul', label: 'X', tone: 'blue', action: { type: 'op', op: '*' } },

  { id: 'help', label: 'fn', fnId: 'help', tone: 'fn', action: { type: 'fn', id: 'help' } },
  { id: 'clrtr', label: 'fn', fnId: 'clrtr', tone: 'fn', action: { type: 'fn', id: 'clrtr' } },
  { id: 'dot', label: '.', tone: 'digit', action: { type: 'dot' } },
  { id: '0', label: '0', tone: 'digit', action: { type: 'digit', n: 0 } },
  { id: 'add', label: '+', tone: 'blue', action: { type: 'op', op: '+' } },
  { id: 'sub', label: '−', tone: 'blue', action: { type: 'op', op: '-' } },
  { id: 'eq', label: '=', tone: 'blue', action: { type: 'equals' } },
]

interface KeypadProps {
  program: CalcProgram
  activeUnit: 'FIS' | 'DEC' | 'INCH' | 'MET'
  onAction: (action: KeyAction) => void
}

export function Keypad({ program, activeUnit, onAction }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Calculator keypad">
      {KEYS.map((key) => {
        const isFn = key.tone === 'fn' && key.fnId
        const label = isFn ? FN_LABELS[key.fnId!][program] : key.label
        const tone = isFn ? fnTone(key.fnId!, program) : (key.tone as KeyTone)
        const active =
          key.action.type === 'mode' && key.action.mode === activeUnit

        return (
          <button
            key={key.id}
            type="button"
            className={`key key-${tone}${active ? ' active' : ''}${key.id === 'mode' ? ' key-mode-btn' : ''}`}
            onClick={() => onAction(key.action)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
