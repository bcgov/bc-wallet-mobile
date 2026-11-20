import { storage } from '@/bcsc-theme/storage'
import { resetBCSCStore, seedBCSCStore } from '@/bcsc-theme/storage/testing'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { usePinnedContacts } from './usePinnedContacts'

describe('usePinnedContacts', () => {
  beforeEach(() => {
    resetBCSCStore()
  })

  it('starts with an empty pin set', () => {
    const { result } = renderHook(() => usePinnedContacts())
    expect(result.current.isPinned('any-id')).toBe(false)
  })

  it('reads the pinned contacts from the store', () => {
    seedBCSCStore({ contacts: { pinned: ['a', 'b'] } })
    const { result } = renderHook(() => usePinnedContacts())
    expect(result.current.isPinned('a')).toBe(true)
    expect(result.current.isPinned('b')).toBe(true)
    expect(result.current.isPinned('c')).toBe(false)
  })

  it('toggles a pin on and saves it', async () => {
    const { result } = renderHook(() => usePinnedContacts())

    act(() => result.current.togglePin('id-1'))

    await waitFor(() => expect(result.current.isPinned('id-1')).toBe(true))
    expect(storage.store.getState().contacts.pinned).toEqual(['id-1'])
  })

  it('toggles a pin off when called twice', async () => {
    const { result } = renderHook(() => usePinnedContacts())

    act(() => result.current.togglePin('id-1'))
    act(() => result.current.togglePin('id-1'))

    // Writes to one key run in order, so the second toggle sees the first
    await waitFor(() => expect(storage.store.getState().contacts.pinned).toEqual([]))
    expect(result.current.isPinned('id-1')).toBe(false)
  })

  it('shares state across hook instances', async () => {
    const { result: a } = renderHook(() => usePinnedContacts())
    const { result: b } = renderHook(() => usePinnedContacts())

    act(() => a.current.togglePin('shared-id'))

    await waitFor(() => expect(b.current.isPinned('shared-id')).toBe(true))
    expect(a.current.isPinned('shared-id')).toBe(true)
  })
})
