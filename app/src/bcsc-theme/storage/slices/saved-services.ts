import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

export const SavedServicesSchema = z.object({
  // client_ref_id of each bookmarked service
  ids: z.array(z.string()),
})

export const SAVED_SERVICES_KEY = persistedKey({
  key: 'savedServices',
  schema: SavedServicesSchema,
  backend: 'encrypted',
  initial: { ids: [] },
})

export interface SavedServicesSlice {
  savedServices: {
    ids: string[]
    setBookmarked(clientRefId: string, bookmarked: boolean): Promise<void>
    clear(): Promise<void>
  }
}

export const createSavedServicesSlice =
  ({ persist }: SliceContext): BCSCSlice<SavedServicesSlice> =>
  () => ({
    savedServices: {
      ...SAVED_SERVICES_KEY.initial,
      setBookmarked: (clientRefId, bookmarked) =>
        persist.update(SAVED_SERVICES_KEY, ({ ids }) => {
          const others = ids.filter((id) => id !== clientRefId)
          return { ids: bookmarked ? [...others, clientRefId] : others }
        }),
      clear: () => persist.remove(SAVED_SERVICES_KEY),
    },
  })
