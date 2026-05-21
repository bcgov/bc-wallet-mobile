import { PersistentStorage } from '@bifold/core'
import { useCallback, useSyncExternalStore } from 'react'

const PINNED_CONTACTS_KEY = 'PinnedContacts'

let pinnedIds: Set<string> = new Set()
let hydrationStarted = false
const listeners = new Set<() => void>()

const notify = () => {
  for (const listener of listeners) {
    listener()
  }
}

const startHydration = () => {
  if (hydrationStarted) {
    return
  }
  hydrationStarted = true
  PersistentStorage.fetchValueForKey<string[]>(PINNED_CONTACTS_KEY).then((ids) => {
    pinnedIds = new Set(ids ?? [])
    notify()
  })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  startHydration()
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => pinnedIds

const togglePinId = (contactId: string) => {
  const next = new Set(pinnedIds)
  if (next.has(contactId)) {
    next.delete(contactId)
  } else {
    next.add(contactId)
  }
  pinnedIds = next
  PersistentStorage.storeValueForKey<string[]>(PINNED_CONTACTS_KEY, Array.from(next))
  notify()
}

/**
 * Custom hook to manage pinned contacts, allowing components to subscribe to changes
 * in the set of pinned contact IDs and toggle the pinned state of individual contacts.
 *
 * @return {*}
 */
export const usePinnedContacts = () => {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const isPinned = useCallback((contactId: string) => ids.has(contactId), [ids])
  const togglePin = useCallback((contactId: string) => togglePinId(contactId), [])
  return { pinnedIds: ids, isPinned, togglePin }
}

/**
 * Resets the module-level pinned-id store, hydration flag, and subscriber list.
 * Tests call this between cases; production code must not.
 */
export const resetPinnedContactsForTests = () => {
  pinnedIds = new Set()
  hydrationStarted = false
  listeners.clear()
}
