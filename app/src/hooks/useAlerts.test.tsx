import { mockUseServices, mockUseStore } from '@/bcsc-theme/hooks/useCreateSystemChecks.test'
import * as ErrorAlertContext from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { renderHook } from '@testing-library/react-native'
import RN, { Platform } from 'react-native'
import { useAlerts } from './useAlerts'

jest.mock('@bifold/core', () => ({
  useStore: () => mockUseStore(),
  useServices: () => mockUseServices(),
  TOKENS: {
    UTIL_LOGGER: 'UTIL_LOGGER',
  },
}))

describe('useAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('problemWithAppAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.problemWithAppAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.GENERAL,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('unsecuredNetworkAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.unsecuredNetworkAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.UnsecuredNetwork.Title',
        'Alerts.UnsecuredNetwork.Description',
        {
          event: AppEventCode.UNSECURED_NETWORK,
          actions: [
            {
              text: 'Global.OK',
            },
          ],
        }
      )
    })
  })

  describe('serverTimeoutAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.serverTimeoutAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ServerTimeout.Title', 'Alerts.ServerTimeout.Description', {
        event: AppEventCode.SERVER_TIMEOUT,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('serverErrorAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.serverErrorAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ServerError.Title', 'Alerts.ServerError.Description', {
        event: AppEventCode.SERVER_ERROR,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('forgetPairingsAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.forgetPairingsAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ForgetPairings.Title', 'Alerts.ForgetPairings.Description', {
        event: AppEventCode.FORGET_ALL_PAIRINGS,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('tooManyAttemptsAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.tooManyAttemptsAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.TooManyAttempts.Title', 'Alerts.TooManyAttempts.Description', {
        event: AppEventCode.TOO_MANY_ATTEMPTS,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('verificationNotCompleteAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.verificationNotCompleteAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.VerificationNotComplete.Title',
        'Alerts.VerificationNotComplete.Description',
        {
          event: AppEventCode.VERIFY_NOT_COMPLETE,
          actions: [
            {
              text: 'Global.OK',
            },
          ],
        }
      )
    })
  })

  describe('invalidPairingCodeAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.invalidPairingCodeAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.InvalidPairingCode.Title',
        'Alerts.InvalidPairingCode.Description',
        {
          event: AppEventCode.INVALID_PAIRING_CODE,
          actions: [
            {
              text: 'Global.OK',
            },
          ],
        }
      )
    })
  })

  describe('alreadyVerifiedAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.alreadyVerifiedAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.AlreadyVerified.Title', 'Alerts.AlreadyVerified.Description', {
        event: AppEventCode.ALREADY_VERIFIED,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('fileUploadErrorAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.fileUploadErrorAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.FileUploadError.Title', 'Alerts.FileUploadError.Description', {
        event: AppEventCode.FILE_UPLOAD_ERROR,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('loginSameDeviceInvalidPairingCodeAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginSameDeviceInvalidPairingCodeAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.InvalidPairingCodeSameDevice.Title',
        'Alerts.InvalidPairingCodeSameDevice.Description',
        {
          event: AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
          actions: [
            {
              text: 'Global.OK',
            },
          ],
        }
      )
    })
  })

  describe('loginServerErrorAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginServerErrorAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.ProblemWithLogin.Title',
        'Alerts.ProblemWithLogin.Description',
        {
          event: AppEventCode.LOGIN_SERVER_ERROR,
          actions: [
            {
              text: 'Global.OK',
            },
          ],
        }
      )
    })
  })

  describe('problemWithLoginAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.problemWithLoginAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.ProblemWithLogin.Title',
        'Alerts.ProblemWithLogin.Description',
        {
          event: AppEventCode.LOGIN_PARSE_URI,
          actions: [
            {
              text: 'Global.OK',
            },
          ],
        }
      )
    })
  })

  describe('loginRejected401Alert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected401Alert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        {
          event: AppEventCode.LOGIN_REJECTED_401,
          actions: [
            {
              text: 'Global.Close',
              style: 'cancel',
            },
            {
              text: 'Alerts.ProblemWithAccount.Action1',
              style: 'destructive',
              onPress: expect.any(Function),
            },
          ],
        }
      )
    })

    it('should navigate to the RemoveAccountConfirmation screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected401Alert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.ProblemWithAccount.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCRemoveAccountConfirmation')
    })
  })

  describe('loginRejected403Alert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected403Alert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        {
          event: AppEventCode.LOGIN_REJECTED_403,
          actions: [
            {
              text: 'Global.Close',
              style: 'cancel',
            },
            {
              text: 'Alerts.ProblemWithAccount.Action1',
              style: 'destructive',
              onPress: expect.any(Function),
            },
          ],
        }
      )
    })

    it('should navigate to the RemoveAccountConfirmation screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected403Alert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.ProblemWithAccount.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCRemoveAccountConfirmation')
    })
  })

  describe('loginRejected400Alert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected400Alert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        {
          event: AppEventCode.LOGIN_REJECTED_400,
          actions: [
            {
              text: 'Global.Close',
              style: 'cancel',
            },
            {
              text: 'Alerts.ProblemWithAccount.Action1',
              style: 'destructive',
              onPress: expect.any(Function),
            },
          ],
        }
      )
    })

    it('should navigate to the RemoveAccountConfirmation screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected400Alert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.ProblemWithAccount.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCRemoveAccountConfirmation')
    })
  })

  describe('appUpdateRequiredAlert', () => {
    it('ios: should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.appUpdateRequiredAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.AppUpdateRequired.Title',
        'Alerts.AppUpdateRequired.Description',
        {
          event: AppEventCode.IOS_APP_UPDATE_REQUIRED,
          actions: [
            {
              text: 'Alerts.AppUpdateRequired.Action1',
              onPress: expect.any(Function),
            },
          ],
        }
      )
    })

    it('ios: should open the app store when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)
      const openURLSpy = jest.spyOn(RN.Linking, 'openURL')

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.appUpdateRequiredAlert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.AppUpdateRequired.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(openURLSpy).toHaveBeenCalledWith('https://apps.apple.com/us/app/id1234298467')
    })

    it('android: should show an alert with the correct title and message', () => {
      Platform.OS = 'android'
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.appUpdateRequiredAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.AppUpdateRequired.Title',
        'Alerts.AppUpdateRequired.Description',
        {
          event: AppEventCode.ANDROID_APP_UPDATE_REQUIRED,
          actions: [
            {
              text: 'Alerts.AppUpdateRequired.Action1',
              onPress: expect.any(Function),
            },
          ],
        }
      )
    })
  })

  describe('setupExpiredAlert', () => {})

  describe('liveCallFileUploadErrorAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.liveCallFileUploadAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.LiveCallFileUploadError.Title',
        'Alerts.LiveCallFileUploadError.Description',
        {
          event: AppEventCode.LIVE_CALL_FILE_UPLOAD_ERROR,
          actions: [
            {
              text: 'Global.OK',
              onPress: expect.any(Function),
            },
          ],
        }
      )
    })

    // FIXME: Investigate mock issue with CommonActions.reset being undefined...
    it.todo('should navigate back to the setupsteps screen when the action is pressed')
  })

  describe('dataUseWarningAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.dataUseWarningAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.DataUseWarning.Title', 'Alerts.DataUseWarning.Description', {
        event: AppEventCode.DATA_USE_WARNING,
        actions: [
          {
            text: 'Global.Continue',
            style: 'cancel',
          },
          {
            text: 'Alerts.DataUseWarning.Action1',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        ],
      })
    })

    it('should navigate to the take photo screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.dataUseWarningAlert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.DataUseWarning.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCTakePhoto', {
        forLiveCall: true,
        deviceSide: 'front',
        cameraInstructions: '',
        cameraLabel: '',
      })
    })
  })

  describe('liveCallHavingTroubleAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const mockAction = jest.fn()

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.liveCallHavingTroubleAlert(mockAction)

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.LiveCallHavingTrouble.Title',
        'Alerts.LiveCallHavingTrouble.Description',
        {
          event: AppEventCode.IN_CALL_HAVING_TROUBLE,
          actions: [
            {
              text: 'Global.Close',
            },
            {
              text: 'Alerts.LiveCallHavingTrouble.Action1',
              style: 'destructive',
              onPress: mockAction,
            },
          ],
        }
      )
    })

    it('should call the provided action when the action button is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const mockAction = jest.fn()

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.liveCallHavingTroubleAlert(mockAction)

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.LiveCallHavingTrouble.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockAction).toHaveBeenCalled()
    })
  })

  describe('cancelVerificationRequestAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const mockAction = jest.fn()

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.cancelVerificationRequestAlert(mockAction)

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.CancelVerificationRequest.Title',
        'Alerts.CancelVerificationRequest.Description',
        {
          event: AppEventCode.CANCEL_VERIFICATION_REQUEST,
          actions: [
            {
              text: 'Alerts.CancelVerificationRequest.Action1',
              style: 'destructive',
              onPress: mockAction,
            },
            {
              text: 'Global.Cancel',
              style: 'cancel',
            },
          ],
        }
      )
    })

    it('should call the provided action when the OK button is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const mockAction = jest.fn()

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.cancelVerificationRequestAlert(mockAction)

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.CancelVerificationRequest.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockAction).toHaveBeenCalled()
    })
  })
})
