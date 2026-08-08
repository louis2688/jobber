import { Dimension, type DisplayMode } from './dimension.ts'
import { EntryBuffer } from './parse.ts'
import {
  emptyTriangle,
  solveTriangle,
  type TriangleField,
  type TriangleState,
} from './triangle.ts'
import { handleProgramKey, ModeBags } from './modeSolvers.ts'
import type { CalcProgram, FnKeyId } from './programs.ts'
import { MemoryBank, MEMORY_SLOT_COUNT } from './memory.ts'

export type Operator = '+' | '-' | '*' | '/'

export interface TapeEntry {
  id: number
  text: string
}

export interface EngineSnapshot {
  mode: DisplayMode
  display: string
  /** D°M′S″ annotation when last angle action produced one */
  dmsDisplay: string | null
  memory: string | null
  memories: (string | null)[]
  activeMemorySlot: number
  tape: TapeEntry[]
  triangle: TriangleState
  error: string | null
  pendingOp: Operator | null
}

const TAPE_LIMIT = 16

/**
 * CalcEngine — arithmetic, modes, memory, paperless tape, triangle store.
 * Pure TS; no UI dependencies.
 */
export class CalcEngine {
  mode: DisplayMode = 'FIS'
  entry = new EntryBuffer('FIS')
  private value: Dimension = Dimension.zero()
  private entering = false
  private pendingOp: Operator | null = null
  private pendingValue: Dimension | null = null
  private memoryBank = new MemoryBank()
  private tape: TapeEntry[] = []
  private tapeSeq = 0
  private triangle: TriangleState = emptyTriangle()
  private triangleInputs: Partial<{
    rise: Dimension
    run: Dimension
    pitch: number
    slope: Dimension
    deg: number
  }> = {}
  private error: string | null = null
  private dmsDisplay: string | null = null
  private lastTriangle: TriangleState | null = null
  private bags = new ModeBags()
  program: CalcProgram = 'triangle'

  getDisplay(): string {
    if (this.error) return this.error
    if (this.entering) return this.entry.formatDisplay()
    return this.value.format(this.mode)
  }

  getSnapshot(): EngineSnapshot {
    return {
      mode: this.mode,
      display: this.getDisplay(),
      dmsDisplay: this.dmsDisplay,
      memory: this.memoryBank.primary()?.format(this.mode) ?? null,
      memories: this.memoryBank.labels(this.mode),
      activeMemorySlot: this.memoryBank.activeSlot,
      tape: [...this.tape],
      triangle: this.triangle,
      error: this.error,
      pendingOp: this.pendingOp,
    }
  }

  getValue(): Dimension {
    return this.entering ? this.entry.toDimension() : this.value
  }

  getTriangle(): TriangleState {
    return this.triangle
  }

  getTape(): TapeEntry[] {
    return [...this.tape]
  }

  getMemory(): Dimension | null {
    return this.memoryBank.primary()
  }

  getMemoryBank(): MemoryBank {
    return this.memoryBank
  }

  setMode(mode: DisplayMode): void {
    this.error = null
    const current = this.getValue()
    this.mode = mode
    this.value = current
    this.entry.reset(mode)
    this.entry.loadFromDimension(current)
    this.entering = false
    this.pushTape(`mode ${mode}`)
  }

  cycleMode(): void {
    const modes: DisplayMode[] = ['FIS', 'DEC', 'INCH', 'MET']
    const next = modes[(modes.indexOf(this.mode) + 1) % modes.length]
    this.setMode(next)
  }

  remainderHint(): void {
    this.error = null
    this.pushTape('rem (MVP: use / for divide)')
  }

  dmsinHint(): void {
    this.error = null
    this.pushTape('DMSin: enter DD.MMSS or D:M:S then press DMSin')
  }

  inputDigit(n: number): void {
    this.error = null
    this.dmsDisplay = null
    this.beginEntry()
    this.entry.inputDigit(n)
  }

  inputDecimalPoint(): void {
    this.error = null
    this.beginEntry()
    this.entry.inputDecimalPoint()
  }

  advanceFisSegment(): void {
    this.error = null
    this.beginEntry()
    this.entry.advanceSegment()
  }

  toggleSign(): void {
    this.error = null
    if (this.entering) {
      this.entry.toggleSign()
    } else {
      this.value = this.value.negate()
    }
  }

  private beginEntry(): void {
    if (!this.entering) {
      this.entry.reset(this.mode)
      this.entering = true
    }
  }

  clearEntry(): void {
    this.error = null
    if (this.entering && this.entry.dirty) {
      this.entry.clearEntry()
      return
    }
    this.allClear()
  }

  allClear(): void {
    this.error = null
    this.value = Dimension.zero()
    this.entry.reset(this.mode)
    this.entering = false
    this.pendingOp = null
    this.pendingValue = null
    this.pushTape('AC')
  }

  setOperator(op: Operator): void {
    this.error = null
    try {
      this.commitPending()
      this.pendingValue = this.getValue()
      this.pendingOp = op
      this.entering = false
      this.value = this.pendingValue
      this.pushTape(`${this.pendingValue.format(this.mode)} ${opLabel(op)}`)
    } catch (e) {
      this.setError(e)
    }
  }

  equals(): void {
    this.error = null
    try {
      this.commitPending()
      this.pushTape(`= ${this.value.format(this.mode)}`)
    } catch (e) {
      this.setError(e)
    }
  }

  private commitPending(): void {
    const rhs = this.getValue()
    if (this.pendingOp && this.pendingValue) {
      this.value = applyOp(this.pendingValue, this.pendingOp, rhs, this.mode)
      this.pendingOp = null
      this.pendingValue = null
    } else {
      this.value = rhs
    }
    this.entering = false
    this.entry.loadFromDimension(this.value)
  }

  memoryStore(slot?: number): void {
    const s = slot ?? this.memoryBank.activeSlot
    const v = this.getValue()
    this.memoryBank.store(s, v)
    this.pushTape(`M${s + 1}<- ${v.format(this.mode)}`)
  }

  memoryRecall(slot?: number): void {
    const s = slot ?? this.memoryBank.activeSlot
    const mem = this.memoryBank.recall(s)
    if (!mem) return
    this.error = null
    this.value = mem
    this.entering = false
    this.entry.loadFromDimension(this.value)
    this.pushTape(`M${s + 1}-> ${this.value.format(this.mode)}`)
  }

  memoryClear(slot?: number): void {
    if (slot == null) {
      this.memoryBank.clear()
      this.pushTape('M clr all')
      return
    }
    this.memoryBank.clear(slot)
    this.pushTape(`M${slot + 1} clr`)
  }

  selectMemorySlot(slot: number): void {
    if (slot < 0 || slot >= MEMORY_SLOT_COUNT) return
    this.memoryBank.activeSlot = slot
  }

  clearTape(): void {
    this.tape = []
  }

  private pushTape(text: string): void {
    this.tapeSeq += 1
    this.tape.unshift({ id: this.tapeSeq, text })
    if (this.tape.length > TAPE_LIMIT) this.tape.length = TAPE_LIMIT
  }

  setTriangleField(field: TriangleField): void {
    this.error = null
    try {
      const current = this.getValue()

      if (field === 'pitch') {
        this.triangleInputs.pitch = Math.abs(numericForPitchDeg(current, this.mode))
      } else if (field === 'deg') {
        this.triangleInputs.deg = numericForPitchDeg(current, this.mode)
      } else {
        this.triangleInputs[field] = current
      }

      this.pushTape(`${fieldLabel(field)} <- ${current.format(this.mode)}`)
      this.trySolveTriangle()
      this.showTriangleField(field)
    } catch (e) {
      this.setError(e)
    }
  }

  private trySolveTriangle(): void {
    const keys = (Object.keys(this.triangleInputs) as TriangleField[]).filter(
      (k) => this.triangleInputs[k] != null,
    )
    if (keys.length < 2) {
      this.triangle = {
        ...emptyTriangle(),
        rise: this.triangleInputs.rise ?? null,
        run: this.triangleInputs.run ?? null,
        pitch: this.triangleInputs.pitch ?? null,
        slope: this.triangleInputs.slope ?? null,
        deg: this.triangleInputs.deg ?? null,
      }
      return
    }

    this.triangle = solveTriangle(this.triangleInputs)
    this.lastTriangle = this.triangle
    this.pushTape('triangle solved')
  }

  showTriangleField(field: TriangleField | 'area'): void {
    this.error = null
    if (field === 'area') {
      if (this.triangle.areaSqIn == null) {
        this.trySolveTriangle()
      }
      if (this.triangle.areaSqIn == null) {
        this.error = 'Need rise & run'
        return
      }
      const sqft = this.triangle.areaSqIn / 144
      this.value = Dimension.fromFeet(sqft)
      this.entering = false
      this.entry.loadFromDimension(this.value)
      this.pushTape(`Area ${sqft.toFixed(4)} ft2`)
      return
    }

    const t = this.triangle
    if (field === 'pitch') {
      if (t.pitch == null) return
      this.mode = 'DEC'
      this.entry.reset('DEC')
      this.value = Dimension.fromFeet(t.pitch)
      this.entering = false
      this.entry.loadFromDimension(this.value)
      this.pushTape(`pitch ${t.pitch.toFixed(4)}/12`)
      return
    }

    if (field === 'deg') {
      if (t.deg == null) return
      this.mode = 'DEC'
      this.entry.reset('DEC')
      this.value = Dimension.fromFeet(t.deg)
      this.entering = false
      this.entry.loadFromDimension(this.value)
      this.pushTape(`deg ${t.deg.toFixed(2)} deg`)
      return
    }

    const dim = t[field]
    if (!dim) return
    this.value = dim
    this.entering = false
    this.entry.loadFromDimension(dim)
  }

  clearTriangle(): void {
    this.triangle = emptyTriangle()
    this.triangleInputs = {}
    this.pushTape('ClrTR')
  }

  recallTriangle(): void {
    if (!this.lastTriangle) return
    this.triangle = this.lastTriangle
    this.triangleInputs = {
      rise: this.lastTriangle.rise ?? undefined,
      run: this.lastTriangle.run ?? undefined,
      pitch: this.lastTriangle.pitch ?? undefined,
      slope: this.lastTriangle.slope ?? undefined,
      deg: this.lastTriangle.deg ?? undefined,
    }
    this.pushTape('ReTR')
    if (this.triangle.slope) {
      this.value = this.triangle.slope
      this.entering = false
      this.entry.loadFromDimension(this.value)
    }
  }


  setProgram(program: CalcProgram): void {
    this.program = program
    this.error = null
    this.pushTape(`program ${program}`)
  }

  handleProgramFn(key: FnKeyId): void {
    this.error = null
    try {
      if (this.program === 'triangle' && key === 'retr') {
        this.recallTriangle()
        return
      }
      const result = handleProgramKey(
        this.program,
        key,
        this.getValue(),
        this.mode,
        this.bags,
        this.triangleInputs,
      )
      if (result.clearTriangle) {
        this.triangle = emptyTriangle()
        this.triangleInputs = {}
      }
      if (result.triangleInputs) {
        this.triangleInputs = result.triangleInputs
      }
      if (result.triangle) {
        this.triangle = result.triangle
        this.lastTriangle = result.triangle
      }
      if (result.forceDec) {
        this.mode = 'DEC'
        this.entry.reset('DEC')
      }
      if (result.value) {
        this.value = result.value
        this.entering = false
        this.entry.loadFromDimension(result.value)
      }
      this.dmsDisplay = result.dmsDisplay ?? null
      this.pushTape(result.tape)
    } catch (e) {
      this.setError(e)
    }
  }

  private setError(e: unknown): void {
    this.error = e instanceof Error ? e.message : 'Error'
    this.pendingOp = null
    this.pendingValue = null
    this.entering = false
  }
}

function applyOp(a: Dimension, op: Operator, b: Dimension, mode: DisplayMode): Dimension {
  switch (op) {
    case '+':
      return a.add(b)
    case '-':
      return a.subtract(b)
    case '*':
      // Second operand treated as dimensionless (mode numeric value / count).
      return a.multiply(scalarOperand(b, mode))
    case '/':
      return a.divide(scalarOperand(b, mode))
  }
}

function scalarOperand(dim: Dimension, mode: DisplayMode): number {
  if (mode === 'FIS') {
    const fis = dim.toFis()
    if (fis.inches === 0 && fis.sixteenths === 0) {
      const n = fis.negative ? -fis.feet : fis.feet
      return n === 0 ? 0 : n
    }
  }
  const n = dim.asModeNumber(mode)
  return n
}


function opLabel(op: Operator): string {
  switch (op) {
    case '+':
      return '+'
    case '-':
      return '-'
    case '*':
      return 'x'
    case '/':
      return '/'
  }
}

function fieldLabel(field: TriangleField): string {
  switch (field) {
    case 'rise':
      return 'Rise'
    case 'run':
      return 'Run'
    case 'pitch':
      return 'Pitch'
    case 'slope':
      return 'SLP'
    case 'deg':
      return 'DEG'
  }
}

function numericForPitchDeg(dim: Dimension, mode: DisplayMode): number {
  switch (mode) {
    case 'FIS':
    case 'DEC':
      return dim.toInches() >= 12 ? dim.toFeet() : dim.toInches()
    case 'INCH':
      return dim.toInches()
    case 'MET':
      return dim.toMm()
  }
}
