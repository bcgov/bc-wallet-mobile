import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { switchMediator } from '@/bcsc-theme/features/agent/services/mediator-service'
import { BCSCQRCoreScreens, BCSCScreens } from '@/bcsc-theme/types/navigators'
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

  it('lists the known mediators with the selected one marked', () => {
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    expect(result.current.mediators).toEqual([
      {
        url: current,
        label: 'https://mediator.example/invite',
        host: 'https://mediator.example/invite',
        selected: true,
      },
      {
        url: other,
        label: 'https://mediator-dev.example/invite',
        host: 'https://mediator-dev.example/invite',
        selected: false,
      },
    ])
    expect(result.current.switchingTo).toBeNull()
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

  it('switches the wallet, persists the choice and moves the device token with it', async () => {
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(switchMediator).toHaveBeenCalledWith(agent, other, mockLogger)
    expect(mockDispatch).toHaveBeenCalledWith({ type: DispatchAction.SET_SELECTED_MEDIATOR, payload: [other] })
    expect(deactivate).toHaveBeenCalledWith(agent)
    expect(activate).toHaveBeenCalledWith(agent)
    expect(callOrder(deactivate)).toBeLessThan(callOrder(switchMediator))
    expect(callOrder(switchMediator)).toBeLessThan(callOrder(activate))
    expect(mockFailedToSwitchMediatorAlert).not.toHaveBeenCalled()
    await waitFor(() => expect(result.current.switchingTo).toBeNull())
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

    expect(switchMediator).toHaveBeenCalledWith(agent, other, mockLogger)
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

  it('alerts when the agent is not available', async () => {
    mockWaitForAgent.mockResolvedValue(null)
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    await act(() => result.current.selectMediator(other))

    expect(switchMediator).not.toHaveBeenCalled()
    expect(deactivate).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()
    expect(mockFailedToSwitchMediatorAlert).toHaveBeenCalled()
  })

  it('opens the scanner to add a mediator', () => {
    const { result } = renderHook(() => useConfigureMediatorViewModel())

    act(() => result.current.scanMediator())

    expect(useNavigation().navigate).toHaveBeenCalledWith(BCSCScreens.QRCore, { screen: BCSCQRCoreScreens.Scanner })
  })
})
