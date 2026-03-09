import * as useFactoryResetModule from '@/bcsc-theme/api/hooks/useFactoryReset'
import { mockUseServices, mockUseStore } from '@/bcsc-theme/hooks/useCreateSystemChecks.test'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import * as ErrorAlertContext from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { CommonActions } from '@react-navigation/native'
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

jest.mock('@/bcsc-theme/contexts/BCSCStackContext', () => ({
  useBCSCStack: () => ({ stack: 'BCSCMainStack' }),
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

  describe('missingJwkAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.missingJwkAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('jwsVerificationFailedAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.jwsVerificationFailedAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_112_JWS_VERIFICATION_FAILED,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
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

  describe('setupExpiredAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.setupExpiredAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.SetupExpired.Title', 'Alerts.SetupExpired.Description', {
        event: AppEventCode.USER_INPUT_EXPIRED_VERIFY_REQUEST,
        actions: [
          {
            text: 'Global.OK',
            onPress: expect.any(Function),
          },
        ],
      })
    })

    it('onPress should factory reset the app', async () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockFactoryReset = jest.fn().mockResolvedValue({ success: true })
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)
      jest.spyOn(useFactoryResetModule, 'useFactoryReset').mockReturnValue(mockFactoryReset as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.setupExpiredAlert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Global.OK')
      expect(action).toBeDefined()

      await action.onPress()

      expect(mockFactoryReset).toHaveBeenCalled()
    })
  })

  describe('liveCallFileUploadAlert', () => {
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

    it('should reset navigation to SetupSteps and VerificationMethodSelection when OK is pressed', () => {
      const mockDispatch = jest.fn()
      const mockNavigation = { navigate: jest.fn(), dispatch: mockDispatch }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.liveCallFileUploadAlert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Global.OK')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockDispatch).toHaveBeenCalledWith(
        CommonActions.reset({
          index: 1,
          routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.VerificationMethodSelection }],
        })
      )
    })
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

  describe('failedToWriteToLocalStorageAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToWriteToLocalStorageAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('failedToSerializeJsonAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToSerializeJsonAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('tokenUnexpectedlyNullAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.tokenUnexpectedlyNullAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_119_TOKEN_UNEXPECTEDLY_NULL,
        actions: [
          {
            text: 'Global.OK',
          },
        ],
      })
    })
  })

  describe('failedToReadFromLocalStorageAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToReadFromLocalStorageAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_101_FAILED_TO_READ_LOCAL_STORAGE,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('failedToParseJwsAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToParseJwsAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_117_FAILED_TO_PARSE_JWS,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('clientRegistrationNullAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.clientRegistrationNullAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('unableToDecryptIdTokenAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.unableToDecryptIdTokenAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('failedToDeserializeJsonAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToDeserializeJsonAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('unableToDecryptJweAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.unableToDecryptJweAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_110_UNABLE_TO_DECRYPT_JWE,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('toJsonMethodFailureAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.toJsonMethodFailureAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_120_TOJSON_METHOD_FAILURE,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('toJsonStringMethodFailureAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.toJsonStringMethodFailureAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('keychainKeyExistsAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.keychainKeyExistsAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('keychainKeyDoesntExistAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.keychainKeyDoesntExistAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('keychainKeyGenerationAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.keychainKeyGenerationAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('jwtDeviceInfoAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.jwtDeviceInfoAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
        event: AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR,
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('noTokensReturnedAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.noTokensReturnedAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        {
          event: AppEventCode.NO_TOKENS_RETURNED,
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

      result.current.noTokensReturnedAlert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.ProblemWithAccount.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCRemoveAccountConfirmation')
    })
  })

  describe('invalidTokenAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.invalidTokenAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        {
          event: AppEventCode.INVALID_TOKEN,
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

      result.current.invalidTokenAlert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.ProblemWithAccount.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCRemoveAccountConfirmation')
    })
  })

  describe('factoryResetAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.factoryResetAlert()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.FactoryReset.Title', 'Alerts.FactoryReset.Description', {
        event: AppEventCode.FATAL_UNRECOVERABLE_ERROR,
        actions: [
          {
            text: 'Alerts.FactoryReset.Action1',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        ],
      })
    })

    it('onPress should factory reset the app', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockFactoryReset = jest.fn()
      jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)
      jest.spyOn(useFactoryResetModule, 'useFactoryReset').mockReturnValue(mockFactoryReset as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.factoryResetAlert()

      const alertOptions = mockEmitAlert.mock.calls[0][2]
      const action = alertOptions.actions.find((a: any) => a.text === 'Alerts.FactoryReset.Action1')
      expect(action).toBeDefined()

      action.onPress()

      expect(mockFactoryReset).toHaveBeenCalled()
    })
  })

  describe('IAS error alerts (201–300)', () => {
    describe('serverConfigurationAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.serverConfigurationAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith(
          'Alerts.ProblemWithService.Title',
          'Alerts.ProblemWithService.Description',
          {
            event: AppEventCode.ADD_CARD_SERVER_CONFIGURATION,
            actions: [{ text: 'Global.OK' }],
          }
        )
      })
    })

    describe('dynamicRegistrationErrorAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.dynamicRegistrationErrorAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith(
          'Alerts.DynamicRegistrationError.Title',
          'Alerts.DynamicRegistrationError.Description',
          {
            event: AppEventCode.ADD_CARD_DYNAMIC_REGISTRATION,
            actions: [
              {
                text: 'Global.OK',
                onPress: expect.any(Function),
              },
            ],
          }
        )
      })

      it('should reset navigation to SetupSteps when OK is pressed', () => {
        const mockDispatch = jest.fn()
        const mockNavigation = { navigate: jest.fn(), dispatch: mockDispatch }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.dynamicRegistrationErrorAlert()

        const alertOptions = mockEmitAlert.mock.calls[0][2]
        const action = alertOptions.actions.find((a: any) => a.text === 'Global.OK')
        expect(action).toBeDefined()

        action.onPress()

        expect(mockDispatch).toHaveBeenCalledWith(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
      })
    })

    describe('termsOfUseErrorAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.termsOfUseErrorAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith(
          'Alerts.ProblemWithService.Title',
          'Alerts.ProblemWithService.Description',
          {
            event: AppEventCode.ADD_CARD_TERMS_OF_USE,
            actions: [
              {
                text: 'Global.OK',
                onPress: expect.any(Function),
              },
            ],
          }
        )
      })

      it('should reset navigation to SetupSteps when OK is pressed', () => {
        const mockDispatch = jest.fn()
        const mockNavigation = { navigate: jest.fn(), dispatch: mockDispatch }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.termsOfUseErrorAlert()

        const alertOptions = mockEmitAlert.mock.calls[0][2]
        const action = alertOptions.actions.find((a: any) => a.text === 'Global.OK')
        expect(action).toBeDefined()

        action.onPress()

        expect(mockDispatch).toHaveBeenCalledWith(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
      })
    })

    describe('incorrectOsAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.incorrectOsAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith(
          'Alerts.ProblemWithService.Title',
          'Alerts.ProblemWithService.Description',
          {
            event: AppEventCode.ADD_CARD_INCORRECT_OS,
            actions: [
              {
                text: 'Global.OK',
                onPress: expect.any(Function),
              },
            ],
          }
        )
      })

      it('should reset navigation to SetupSteps when OK is pressed', () => {
        const mockDispatch = jest.fn()
        const mockNavigation = { navigate: jest.fn(), dispatch: mockDispatch }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.incorrectOsAlert()

        const alertOptions = mockEmitAlert.mock.calls[0][2]
        const action = alertOptions.actions.find((a: any) => a.text === 'Global.OK')
        expect(action).toBeDefined()

        action.onPress()

        expect(mockDispatch).toHaveBeenCalledWith(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
      })
    })

    describe('addCardNotAvailableAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.addCardNotAvailableAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith(
          'Alerts.AddCardNotAvailable.Title',
          'Alerts.AddCardNotAvailable.Description',
          {
            event: AppEventCode.ADD_CARD_PROVIDER,
            actions: [{ text: 'Global.OK' }],
          }
        )
      })
    })

    describe('missingJsonValuesAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.missingJsonValuesAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('signClaimsErrorAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.signClaimsErrorAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('unexpectedNetworkCallAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.unexpectedNetworkCallAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_208_UNEXPECTED_NETWORK_CALL_EXCEPTION,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('badRequestAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.badRequestAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_209_BAD_REQUEST,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('unauthorizedAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.unauthorizedAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_210_UNAUTHORIZED,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('serverOutageAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.serverOutageAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_211_SERVER_OUTAGE,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('retryLaterAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.retryLaterAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_212_RETRY_LATER,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('creatingClientRegistrationFailedAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.creatingClientRegistrationFailedAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_213_FAILED_CREATING_CLIENT_REGISTRATION,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('keysOutOfSyncAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.keysOutOfSyncAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_299_KEYS_OUT_OF_SYNC,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })

    describe('emptyResponseAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitAlert: mockEmitAlert } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.emptyResponseAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ProblemWithApp.Title', 'Alerts.ProblemWithApp.Description', {
          event: AppEventCode.ERR_300_EMPTY_RESPONSE,
          actions: [{ text: 'Global.OK' }],
        })
      })
    })
  })
})
