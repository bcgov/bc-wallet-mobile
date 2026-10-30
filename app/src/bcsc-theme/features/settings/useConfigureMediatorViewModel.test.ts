import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { switchMediator } from '@/bcsc-theme/features/agent/services/mediator-service'
import { BCSCQRCoreScreens, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { activate, deactivate } from '@/utils/PushNotificationsHelper'
import * as Bifold from '@bifold/core'
import { DispatchAction } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useConfigureMediatorViewModel } from './useConfigureMediatorViewModel'

jest.mock('@/bcsc-theme/features/agent/BCSCAgentProvider')
jest.mock('@/bcsc-theme/features/agent/services/mediator-service', () => ({
  ...jest.requireActual('@/bcsc-theme/features/agent/services/mediator-service'),
  switchMediator: jest.fn(),
}))
jest.mock('@/utils/PushNotificationsHelper', () => ({ activate: jest.fn(), deactivate: jest.fn() }))
const mockFailedToSwitchMediatorAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ failedToSwitchMediatorAlert: mockFailedToSwitchMediatorAlert }),
}))
jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useStore: jest.fn(),
  useServices: jest.fn(),
}))
// The build's mediator is the one the picker lists first; served as both the default and the named export
jest.mock('react-native-config', () => {
  const config = { MEDIATOR_URL: 'https://mediator.example/invite?oob=current' }
  return { ...config, Config: config }
})

const current = 'https://mediator.example/invite?oob=current'
const other = 'https://mediator-dev.example/invite?oob=other'
const scanned = 'https://mediator-new.example/invite?oob=scanned'

const mockDispatch = jest.fn()
const mockWaitForAgent = jest.fn()
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
const agent = { id: 'agent' }

const setStore = (overrides: Record<string, unknown> = {}) =>
  jest.mocked(Bifold.useStore).mockReturnValue([
    {
      preferences: {
        availableMediators: [current, other],
        selectedMediator: current,
        usePushNotifications: true,
        ...overrides,
      },
    } as never,
    mockDispatch,
  ])

const callOrder = (fn: unknown) => jest.mocked(fn as jest.Mock).mock.invocationCallOrder[0]

describe('useConfigureMediatorViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useBCSCAgent).mockReturnValue({ waitForAgent: mockWaitForAgent } as never)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as never)
    jest.mocked(switchMediator).mockResolvedValue({ id: 'med' } as never)
    jest.mocked(activate).mockResolvedValue(undefined)
    jest.mocked(deactivate).mockResolvedValue(undefined)
    mockWaitForAgent.mockResolvedValue(agent)
    setStore()
  })

  it('lists the known mediators with the selected one marked and the rest removable', () => {
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    expect(result.current.mediators).toEqual([
      {
        url: current,
        label: 'https://mediator.example/invite',
        host: 'https://mediator.example/invite',
        selected: true,
        removable: false,
        removeLabel: 'BCSC.ConfigureMediator.Remove',
      },
      {
        url: other,
        label: 'https://mediator-dev.example/invite',
        host: 'https://mediator-dev.example/invite',
        selected: false,
        removable: true,
        removeLabel: 'BCSC.ConfigureMediator.Remove',
      },
    ])
    expect(result.current.switchingTo).toBeNull()
  })

  it("keeps the build's mediator and the selected one off the removable rows", () => {
    setStore({ availableMediators: [current, other, scanned], selectedMediator: other })
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    expect(result.current.mediators.map(({ url, removable }) => [url, removable])).toEqual([
      [current, false],
      [other, false],
      [scanned, true],
    ])
  })

  it('adds a scanned mediator invitation to the list once', () => {
    renderHook(() => useConfigureMediatorViewModel(scanned))

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledWith({ type: DispatchAction.ADD_AVAILABLE_MEDIATOR, payload: [scanned] })
  })

  it('does not re-add a scanned mediator already on the list', () => {
    renderHook(() => useConfigureMediatorViewModel(other))

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('ignores a tap on the selected mediator', async () => {
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(current))

    expect(switchMediator).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('switches the wallet under its label, persists the choice and moves the device token with it', async () => {
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(switchMediator).toHaveBeenCalledWith(agent, { mediatorUrl: other, label: 'BC Wallet' }, mockLogger)
    expect(mockDispatch).toHaveBeenCalledWith({ type: DispatchAction.SET_SELECTED_MEDIATOR, payload: [other] })
    expect(deactivate).toHaveBeenCalledWith(agent)
    expect(activate).toHaveBeenCalledWith(agent)
    expect(callOrder(deactivate)).toBeLessThan(callOrder(switchMediator))
    expect(callOrder(switchMediator)).toBeLessThan(callOrder(activate))
    expect(mockFailedToSwitchMediatorAlert).not.toHaveBeenCalled()
    await waitFor(() => expect(result.current.switchingTo).toBeNull())
  })

  it('sends the wallet name as the label when one is set', async () => {
    setStore({ walletName: 'Work phone' })
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(switchMediator).toHaveBeenCalledWith(agent, { mediatorUrl: other, label: 'Work phone' }, mockLogger)
  })

  it('leaves push notifications alone when they are off', async () => {
    setStore({ usePushNotifications: false })
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(mockDispatch).toHaveBeenCalledWith({ type: DispatchAction.SET_SELECTED_MEDIATOR, payload: [other] })
    expect(deactivate).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()
  })

  it('still switches when the device token cannot be cleared first', async () => {
    jest.mocked(deactivate).mockRejectedValue(new Error('mediator unreachable'))
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(switchMediator).toHaveBeenCalledWith(agent, { mediatorUrl: other, label: 'BC Wallet' }, mockLogger)
    expect(mockDispatch).toHaveBeenCalledWith({ type: DispatchAction.SET_SELECTED_MEDIATOR, payload: [other] })
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('alerts, keeps the current mediator and re-registers the device token when the switch fails', async () => {
    const failure = new Error('mediation denied')
    jest.mocked(switchMediator).mockRejectedValue(failure)
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(mockFailedToSwitchMediatorAlert).toHaveBeenCalledWith(failure)
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(activate).toHaveBeenCalledWith(agent)
    expect(result.current.switchingTo).toBeNull()
  })

  it('keeps the picker locked until the device token is registered with the new mediator', async () => {
    let registered!: () => void
    jest.mocked(activate).mockImplementation(() => new Promise<void>((resolve) => (registered = resolve)))
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    act(() => {
      result.current.selectMediator(other)
    })
    await waitFor(() => expect(activate).toHaveBeenCalledWith(agent))
    expect(result.current.switchingTo).toBe(other)

    await act(async () => registered())

    expect(result.current.switchingTo).toBeNull()
  })

  it('finishes the switch when registering the device token afterwards fails', async () => {
    jest.mocked(activate).mockRejectedValue(new Error('mediator unreachable'))
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(mockDispatch).toHaveBeenCalledWith({ type: DispatchAction.SET_SELECTED_MEDIATOR, payload: [other] })
    expect(mockLogger.warn).toHaveBeenCalled()
    expect(mockFailedToSwitchMediatorAlert).not.toHaveBeenCalled()
    expect(result.current.switchingTo).toBeNull()
  })

  it('alerts when the agent is not available', async () => {
    mockWaitForAgent.mockResolvedValue(null)
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(switchMediator).not.toHaveBeenCalled()
    expect(deactivate).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()
    expect(mockFailedToSwitchMediatorAlert).toHaveBeenCalled()
  })

  it('removes a mediator that is not in use', () => {
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    act(() => result.current.removeMediator(other))

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledWith({ type: BCDispatchAction.REMOVE_AVAILABLE_MEDIATOR, payload: [other] })
  })

  it("keeps the selected mediator and the build's mediator", () => {
    setStore({ availableMediators: [current, other], selectedMediator: other })
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    act(() => result.current.removeMediator(other))
    act(() => result.current.removeMediator(current))

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('does not remove a mediator while a switch is in progress', async () => {
    setStore({ availableMediators: [current, other, scanned] })
    let registered!: () => void
    jest.mocked(activate).mockImplementation(() => new Promise<void>((resolve) => (registered = resolve)))
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    act(() => {
      result.current.selectMediator(other)
    })
    await waitFor(() => expect(result.current.switchingTo).toBe(other))
    act(() => result.current.removeMediator(scanned))

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: BCDispatchAction.REMOVE_AVAILABLE_MEDIATOR })
    )

    await act(async () => registered())
  })

  it('opens the scanner to add a mediator', () => {
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    act(() => result.current.scanMediator())

    expect(useNavigation().navigate).toHaveBeenCalledWith(BCSCScreens.QRCore, { screen: BCSCQRCoreScreens.Scanner })
  })
})
