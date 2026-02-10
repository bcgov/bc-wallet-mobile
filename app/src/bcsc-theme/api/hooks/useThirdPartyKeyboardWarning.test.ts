import useThirdPartyKeyboardWarning from '@/bcsc-theme/api/hooks/useThirdPartyKeyboardWarning'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'
import { isThirdPartyKeyboardActive, openKeyboardSelector } from 'react-native-bcsc-core'

jest.mock('@/contexts/ErrorAlertContext')
jest.mock('@bifold/core')
jest.mock('react-native-bcsc-core', () => ({
  isThirdPartyKeyboardActive: jest.fn(),
  openKeyboardSelector: jest.fn(),
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('useThirdPartyKeyboardWarning', () => {
  const mockDispatch = jest.fn()
  const emitAlert = jest.fn()

  const setStore = (hasDismissedThirdPartyKeyboardAlert: boolean) => {
    const mockState = {
      bcsc: { hasDismissedThirdPartyKeyboardAlert },
    } as BCState
    jest.mocked(useStore).mockReturnValue([mockState, mockDispatch])
  }

  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(useErrorAlert).mockReturnValue({ emitAlert } as any)
    ;(Platform as any).OS = 'android'
  })

  it('should not emit alert when already dismissed', async () => {
    setStore(true)
    jest.mocked(isThirdPartyKeyboardActive).mockResolvedValue(true)

    const hook = renderHook(() => useThirdPartyKeyboardWarning())

    await act(async () => {
      await hook.result.current.showThirdPartyKeyboardWarning()
    })

    expect(isThirdPartyKeyboardActive).not.toHaveBeenCalled()
    expect(emitAlert).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should not emit alert on iOS', async () => {
    setStore(false)
    ;(Platform as any).OS = 'ios'
    jest.mocked(isThirdPartyKeyboardActive).mockResolvedValue(true)

    const hook = renderHook(() => useThirdPartyKeyboardWarning())

    await act(async () => {
      await hook.result.current.showThirdPartyKeyboardWarning()
    })

    expect(isThirdPartyKeyboardActive).not.toHaveBeenCalled()
    expect(emitAlert).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should emit alert and dispatch when a third-party keyboard is active', async () => {
    setStore(false)
    jest.mocked(isThirdPartyKeyboardActive).mockResolvedValue(true)

    const hook = renderHook(() => useThirdPartyKeyboardWarning())

    await act(async () => {
      await hook.result.current.showThirdPartyKeyboardWarning()
    })

    expect(emitAlert).toHaveBeenCalledWith(
      'BCSC.ThirdPartyKeyboard.Title',
      'BCSC.ThirdPartyKeyboard.Message',
      expect.objectContaining({
        actions: [
          { text: 'BCSC.ThirdPartyKeyboard.ContinueButton', style: 'cancel' },
          {
            text: 'BCSC.ThirdPartyKeyboard.ChangeButton',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        ],
      })
    )

    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.DISMISSED_THIRD_PARTY_KEYBOARD_ALERT,
      payload: [true],
    })

    const alertOptions = emitAlert.mock.calls[0][2]
    const changeAction = alertOptions.actions.find(
      (action: { text: string }) => action.text === 'BCSC.ThirdPartyKeyboard.ChangeButton'
    )
    changeAction.onPress()

    expect(openKeyboardSelector).toHaveBeenCalledTimes(1)
  })

  it('should not emit alert when third-party keyboard is not active', async () => {
    setStore(false)
    jest.mocked(isThirdPartyKeyboardActive).mockResolvedValue(false)

    const hook = renderHook(() => useThirdPartyKeyboardWarning())

    await act(async () => {
      await hook.result.current.showThirdPartyKeyboardWarning()
    })

    expect(emitAlert).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
