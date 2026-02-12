/* eslint-disable no-extra-semi */
import { BCDispatchAction } from '@/store'
import { Platform } from 'react-native'
import { isThirdPartyKeyboardActive, openAndroidKeyboardSelector } from 'react-native-bcsc-core'
import { showThirdPartyKeyboardWarning } from './useThirdPartyKeyboardWarning'

jest.mock('@bifold/core')

jest.mock('react-native-bcsc-core', () => ({
  isThirdPartyKeyboardActive: jest.fn(),
  openAndroidKeyboardSelector: jest.fn(),
}))

describe('showThirdPartyKeyboardWarning', () => {
  const mockT = (key: string) => key
  const mockEmitAlert = jest.fn()
  const mockDispatch = jest.fn()

  beforeEach(() => {
    Platform.OS = 'ios'
    jest.clearAllMocks()
  })

  describe('when warning has already been dismissed', () => {
    it('should not show alert or dispatch', async () => {
      await showThirdPartyKeyboardWarning(true, mockT, mockEmitAlert, mockDispatch)

      expect(mockEmitAlert).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('on iOS', () => {
    beforeEach(() => {
      ;(Platform.OS as any) = 'ios'
    })

    it('should not show alert or dispatch', async () => {
      ;(isThirdPartyKeyboardActive as jest.Mock).mockResolvedValue(true)

      await showThirdPartyKeyboardWarning(false, mockT, mockEmitAlert, mockDispatch)

      expect(mockEmitAlert).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(isThirdPartyKeyboardActive).not.toHaveBeenCalled()
    })
  })

  describe('on Android with third-party keyboard active', () => {
    beforeEach(() => {
      ;(Platform.OS as any) = 'android'
      ;(isThirdPartyKeyboardActive as jest.Mock).mockResolvedValue(true)
    })

    it('should show alert with correct title and description', async () => {
      await showThirdPartyKeyboardWarning(false, mockT, mockEmitAlert, mockDispatch)

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.ThirdPartyKeyboard.Title',
        'Alerts.ThirdPartyKeyboard.Description',
        expect.any(Object)
      )
    })

    it('should show alert with cancel and destructive actions', async () => {
      await showThirdPartyKeyboardWarning(false, mockT, mockEmitAlert, mockDispatch)

      const callArgs = mockEmitAlert.mock.calls[0][2]
      expect(callArgs.actions).toHaveLength(2)
      expect(callArgs.actions[0]).toEqual({
        text: 'Alerts.ThirdPartyKeyboard.Action1',
        style: 'cancel',
      })
      expect(callArgs.actions[1]).toEqual({
        text: 'Alerts.ThirdPartyKeyboard.Action2',
        style: 'destructive',
        onPress: expect.any(Function),
      })
    })

    it('should dispatch DISMISSED_THIRD_PARTY_KEYBOARD_ALERT action', async () => {
      await showThirdPartyKeyboardWarning(false, mockT, mockEmitAlert, mockDispatch)

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.DISMISSED_THIRD_PARTY_KEYBOARD_ALERT,
        payload: [true],
      })
    })

    it('should call openAndroidKeyboardSelector when Action2 is pressed', async () => {
      await showThirdPartyKeyboardWarning(false, mockT, mockEmitAlert, mockDispatch)

      const callArgs = mockEmitAlert.mock.calls[0][2]
      const action2 = callArgs.actions[1]

      action2.onPress()

      expect(openAndroidKeyboardSelector).toHaveBeenCalled()
    })
  })

  describe('on Android without third-party keyboard', () => {
    beforeEach(() => {
      ;(Platform.OS as any) = 'android'
      ;(isThirdPartyKeyboardActive as jest.Mock).mockResolvedValue(false)
    })

    it('should not show alert or dispatch', async () => {
      await showThirdPartyKeyboardWarning(false, mockT, mockEmitAlert, mockDispatch)

      expect(mockEmitAlert).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('with custom translation function', () => {
    it('should use translation function for all alert text', async () => {
      const customT = jest.fn((key: string) => `translated_${key}`)
      ;(Platform.OS as any) = 'android'
      ;(isThirdPartyKeyboardActive as jest.Mock).mockResolvedValue(true)

      await showThirdPartyKeyboardWarning(false, customT, mockEmitAlert, mockDispatch)

      expect(customT).toHaveBeenCalledWith('Alerts.ThirdPartyKeyboard.Title')
      expect(customT).toHaveBeenCalledWith('Alerts.ThirdPartyKeyboard.Description')
      expect(customT).toHaveBeenCalledWith('Alerts.ThirdPartyKeyboard.Action1')
      expect(customT).toHaveBeenCalledWith('Alerts.ThirdPartyKeyboard.Action2')

      const callArgs = mockEmitAlert.mock.calls[0]
      expect(callArgs[0]).toBe('translated_Alerts.ThirdPartyKeyboard.Title')
      expect(callArgs[1]).toBe('translated_Alerts.ThirdPartyKeyboard.Description')
    })
  })
})
