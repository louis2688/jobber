import { Dimension } from './dimension.ts'
import type { DisplayMode } from './dimension.ts'

/** Jobber-style 5-slot memory bank (display cells 0–4). */
export const MEMORY_SLOT_COUNT = 5

export class MemoryBank {
  private slots: (Dimension | null)[] = Array.from(
    { length: MEMORY_SLOT_COUNT },
    () => null,
  )
  activeSlot = 0

  get(slot: number): Dimension | null {
    if (slot < 0 || slot >= MEMORY_SLOT_COUNT) return null
    return this.slots[slot]
  }

  store(slot: number, value: Dimension): void {
    if (slot < 0 || slot >= MEMORY_SLOT_COUNT) return
    this.slots[slot] = value
    this.activeSlot = slot
  }

  recall(slot: number): Dimension | null {
    if (slot < 0 || slot >= MEMORY_SLOT_COUNT) return null
    const v = this.slots[slot]
    if (v) this.activeSlot = slot
    return v
  }

  clear(slot?: number): void {
    if (slot == null) {
      this.slots = Array.from({ length: MEMORY_SLOT_COUNT }, () => null)
      this.activeSlot = 0
      return
    }
    if (slot >= 0 && slot < MEMORY_SLOT_COUNT) this.slots[slot] = null
  }

  /** Formatted labels for the 5 display cells. */
  labels(mode: DisplayMode): (string | null)[] {
    return this.slots.map((s) => (s ? s.format(mode) : null))
  }

  /** First non-empty slot (legacy single-memory display). */
  primary(): Dimension | null {
    return this.slots.find((s) => s != null) ?? null
  }
}
