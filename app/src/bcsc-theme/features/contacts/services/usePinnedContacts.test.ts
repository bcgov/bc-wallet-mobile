import { act, renderHook, waitFor } from '@testing-library/react-native'
import { resetPinnedContactsForTests, usePinnedContacts } from './usePinnedContacts'

const mockFetchValue = jest.fn<Promise<string[] | null>, []>().mockResolvedValue(null)
const mockStoreValue = jest.fn().mockResolvedValue(undefined)

jest.mock('@bifold/core', () => ({
  PersistentStorage: {
    fetchValueForKey: (...args: unknown[]) => mockFetchValue(...(args as [])),
    storeValueForKey: (...args: unknown[]) => mockStoreValue(...args),
  },
}))

describe('usePinnedContacts', () => {
  beforeEach(() => {
    mockFetchValue.mockReset().mockResolvedValue(null)
    mockStoreValue.mockReset().mockResolvedValue(undefined)
    resetPinnedContactsForTests()
  })

  it('starts with an empty pin set', () => {
    const { result } = renderHook(() => usePinnedContacts())
    expect(result.current.isPinned('any-id')).toBe(false)
  })

  it('hydrates the pin set from PersistentStorage', async () => {
    mockFetchValue.mockResolvedValueOnce(['a', 'b'])
    const { result } = renderHook(() => usePinnedContacts())
    await waitFor(() => {
      expect(result.current.isPinned('a')).toBe(true)
    })
    expect(result.current.isPinned('b')).toBe(true)
    expect(result.current.isPinned('c')).toBe(false)
  })

  it('toggles a pin on and persists the new set', async () => {
    const { result } = renderHook(() => usePinnedContacts())
    await waitFor(() => expect(mockFetchValue).toHaveBeenCalled())

    act(() => result.current.togglePin('id-1'))

    expect(result.current.isPinned('id-1')).toBe(true)
    expect(mockStoreValue).toHaveBeenLastCalledWith('PinnedContacts', ['id-1'])
  })

  it('toggles a pin off when called twice', async () => {
    const { result } = renderHook(() => usePinnedContacts())
    await waitFor(() => expect(mockFetchValue).toHaveBeenCalled())

    act(() => result.current.togglePin('id-1'))
    act(() => result.current.togglePin('id-1'))

    expect(result.current.isPinned('id-1')).toBe(false)
    expect(mockStoreValue).toHaveBeenLastCalledWith('PinnedContacts', [])
  })

  it('shares state across hook instances', async () => {
    const { result: a } = renderHook(() => usePinnedContacts())
    const { result: b } = renderHook(() => usePinnedContacts())
    await waitFor(() => expect(mockFetchValue).toHaveBeenCalled())

    act(() => a.current.togglePin('shared-id'))

    expect(a.current.isPinned('shared-id')).toBe(true)
    expect(b.current.isPinned('shared-id')).toBe(true)
  })

  it('only hydrates from storage once across multiple hook mounts', async () => {
    renderHook(() => usePinnedContacts())
    renderHook(() => usePinnedContacts())
    renderHook(() => usePinnedContacts())
    await waitFor(() => expect(mockFetchValue).toHaveBeenCalled())
    expect(mockFetchValue).toHaveBeenCalledTimes(1)
  })
})
