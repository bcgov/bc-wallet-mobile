import { useContacts } from '@/bcsc-theme/storage/hooks'
import { useCallback, useMemo } from 'react'

/**
 * Pinned contacts, from the contacts slice of the BCSC store.
 *
 * @return the pinned contact IDs, and functions to check and toggle one
 */
export const usePinnedContacts = () => {
  const { pinned, togglePinned } = useContacts()
  const pinnedIds = useMemo(() => new Set(pinned), [pinned])
  const isPinned = useCallback((contactId: string) => pinnedIds.has(contactId), [pinnedIds])
  const togglePin = useCallback((contactId: string) => void togglePinned(contactId), [togglePinned])
  return { pinnedIds, isPinned, togglePin }
}
