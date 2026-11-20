import type { StateCreator } from 'zustand/vanilla'
import type { BCSCStore } from '.'
import type { SlicePersistence } from '../engine/persistence'

export type BCSCSlice<S> = StateCreator<BCSCStore, [], [], S>

export interface SliceContext {
  persist: SlicePersistence
}
