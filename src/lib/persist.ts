import type { DisplayMode } from './dimension.ts'
import { Dimension } from './dimension.ts'
import type { CalcProgram } from './programs.ts'
import { PROGRAMS } from './programs.ts'
import type { CalcEngine } from './engine.ts'
import { MEMORY_SLOT_COUNT } from './memory.ts'

const STORAGE_KEY = 'jobber-calc-v1'

export interface PersistState {
  v: 1
  program: CalcProgram
  mode: DisplayMode
  activeMemorySlot: number
  memoriesInches: (number | null)[]
  triangle?: {
    riseIn: number | null
    runIn: number | null
    pitch: number | null
    slopeIn: number | null
    deg: number | null
  }
  roof?: {
    pitch: number | null
    pitch2: number | null
    riseIn: number | null
    runIn: number | null
    slopeIn: number | null
    deg: number | null
    spacIn: number | null
    rakeIndex: number
    jackSide?: 1 | 2
  }
  stairs?: {
    riserHIn: number | null
    trdWthIn: number | null
    flflIn: number | null
    steps: number | null
    runIn: number | null
    noseIn: number | null
  }
}

function dimIn(d: Dimension | null | undefined): number | null {
  return d ? d.toInches() : null
}

function fromIn(n: number | null | undefined): Dimension | null {
  if (n == null || !Number.isFinite(n)) return null
  return Dimension.fromInches(n)
}

const MODES: DisplayMode[] = ['FIS', 'DEC', 'INCH', 'MET']

export function capturePersistState(engine: CalcEngine): PersistState {
  const snap = engine.getSnapshot()
  const bags = engine.getBags()
  const bank = engine.getMemoryBank()
  const tri = snap.triangle
  const roof = bags.roof
  const stairs = bags.stairs

  return {
    v: 1,
    program: engine.program,
    mode: snap.mode,
    activeMemorySlot: bank.activeSlot,
    memoriesInches: Array.from({ length: MEMORY_SLOT_COUNT }, (_, i) =>
      dimIn(bank.get(i)),
    ),
    triangle: {
      riseIn: dimIn(tri.rise),
      runIn: dimIn(tri.run),
      pitch: tri.pitch,
      slopeIn: dimIn(tri.slope),
      deg: tri.deg,
    },
    roof: {
      pitch: roof.pitch,
      pitch2: roof.pitch2,
      riseIn: dimIn(roof.rise),
      runIn: dimIn(roof.run),
      slopeIn: dimIn(roof.slope),
      deg: roof.deg,
      spacIn: dimIn(roof.spac),
      rakeIndex: roof.rakeIndex,
      jackSide: roof.jackSide,
    },
    stairs: {
      riserHIn: dimIn(stairs.riserH),
      trdWthIn: dimIn(stairs.trdWth),
      flflIn: dimIn(stairs.flfl),
      steps: stairs.steps,
      runIn: dimIn(stairs.run),
      noseIn: dimIn(stairs.nose),
    },
  }
}

export function applyPersistState(engine: CalcEngine, data: PersistState): void {
  if (data.v !== 1) return

  if (PROGRAMS.includes(data.program)) {
    engine.setProgram(data.program)
  }
  if (MODES.includes(data.mode)) {
    engine.setMode(data.mode)
  }

  const bank = engine.getMemoryBank()
  bank.clear()
  const slots = data.memoriesInches ?? []
  for (let i = 0; i < MEMORY_SLOT_COUNT; i++) {
    const inches = slots[i]
    if (inches != null && Number.isFinite(inches)) {
      bank.store(i, Dimension.fromInches(inches))
    }
  }
  if (
    typeof data.activeMemorySlot === 'number' &&
    data.activeMemorySlot >= 0 &&
    data.activeMemorySlot < MEMORY_SLOT_COUNT
  ) {
    bank.activeSlot = data.activeMemorySlot
  }

  if (data.triangle) {
    engine.restoreTriangleBag({
      rise: fromIn(data.triangle.riseIn) ?? undefined,
      run: fromIn(data.triangle.runIn) ?? undefined,
      pitch: data.triangle.pitch ?? undefined,
      slope: fromIn(data.triangle.slopeIn) ?? undefined,
      deg: data.triangle.deg ?? undefined,
    })
  }

  const bags = engine.getBags()
  if (data.roof) {
    bags.roof = {
      pitch: data.roof.pitch,
      pitch2: data.roof.pitch2,
      rise: fromIn(data.roof.riseIn),
      run: fromIn(data.roof.runIn),
      slope: fromIn(data.roof.slopeIn),
      deg: data.roof.deg,
      spac: fromIn(data.roof.spacIn),
      rakeIndex: Math.max(0, data.roof.rakeIndex ?? 0),
      jackSide: data.roof.jackSide === 2 ? 2 : 1,
    }
  }
  if (data.stairs) {
    bags.stairs = {
      riserH: fromIn(data.stairs.riserHIn),
      trdWth: fromIn(data.stairs.trdWthIn),
      flfl: fromIn(data.stairs.flflIn),
      steps: data.stairs.steps,
      run: fromIn(data.stairs.runIn),
      nose: fromIn(data.stairs.noseIn),
    }
  }

  // Drop restore noise from setProgram/setMode tape lines
  engine.clearTape()
}

export function loadPersistState(): PersistState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PersistState
    if (data?.v !== 1) return null
    return data
  } catch {
    return null
  }
}

export function savePersistState(state: PersistState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota / private mode — ignore
  }
}
