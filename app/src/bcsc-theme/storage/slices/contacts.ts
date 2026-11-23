import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

export const ContactsSchema = z.object({
  pinned: z.array(z.string()),
  // Connection ID to the name the user gave the contact
  alternateNames: z.record(z.string(), z.string()),
})
export type ContactsState = z.infer<typeof ContactsSchema>

export const CONTACTS_KEY = persistedKey({
  key: 'contacts',
  schema: ContactsSchema,
  backend: 'encrypted',
  initial: { pinned: [], alternateNames: {} },
})

export interface ContactsSlice {
  contacts: ContactsState & {
    setPinned(pinned: string[]): Promise<void>
    togglePinned(connectionId: string): Promise<void>
    setAlternateName(connectionId: string, name: string | undefined): Promise<void>
  }
}

export const createContactsSlice =
  ({ persist }: SliceContext): BCSCSlice<ContactsSlice> =>
  () => ({
    contacts: {
      ...CONTACTS_KEY.initial,
      setPinned: (pinned) => persist.update(CONTACTS_KEY, (c) => ({ ...c, pinned })),
      togglePinned: (connectionId) =>
        persist.update(CONTACTS_KEY, (c) => ({
          ...c,
          pinned: c.pinned.includes(connectionId)
            ? c.pinned.filter((id) => id !== connectionId)
            : [...c.pinned, connectionId],
        })),
      setAlternateName: (connectionId, name) =>
        persist.update(CONTACTS_KEY, (c) => {
          const rest = Object.fromEntries(Object.entries(c.alternateNames).filter(([id]) => id !== connectionId))
          return { ...c, alternateNames: name ? { ...rest, [connectionId]: name } : rest }
        }),
    },
  })
