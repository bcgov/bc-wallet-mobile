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
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.problemWithAppAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.GENERAL })
      )
    })
  })

  describe('unsecuredNetworkAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.unsecuredNetworkAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.UnsecuredNetwork.Title',
        'Alerts.UnsecuredNetwork.Description',
        expect.objectContaining({ appEvent: AppEventCode.UNSECURED_NETWORK })
      )
    })
  })

  describe('serverTimeoutAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.serverTimeoutAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ServerTimeout.Title',
        'Alerts.ServerTimeout.Description',
        expect.objectContaining({ appEvent: AppEventCode.SERVER_TIMEOUT })
      )
    })
  })

  describe('serverErrorAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.serverErrorAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ServerError.Title',
        'Alerts.ServerError.Description',
        expect.objectContaining({ appEvent: AppEventCode.SERVER_ERROR })
      )
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
        actions: [{ text: 'Global.OK' }],
      })
    })
  })

  describe('tooManyAttemptsAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.tooManyAttemptsAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.TooManyAttempts.Title',
        'Alerts.TooManyAttempts.Description',
        expect.objectContaining({ appEvent: AppEventCode.TOO_MANY_ATTEMPTS })
      )
    })
  })

  describe('verificationNotCompleteAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.verificationNotCompleteAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.VerificationNotComplete.Title',
        'Alerts.VerificationNotComplete.Description',
        expect.objectContaining({ appEvent: AppEventCode.VERIFY_NOT_COMPLETE })
      )
    })
  })

  describe('invalidPairingCodeAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.invalidPairingCodeAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.InvalidPairingCode.Title',
        'Alerts.InvalidPairingCode.Description',
        expect.objectContaining({ appEvent: AppEventCode.INVALID_PAIRING_CODE })
      )
    })
  })

  describe('alreadyVerifiedAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.alreadyVerifiedAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.AlreadyVerified.Title',
        'Alerts.AlreadyVerified.Description',
        expect.objectContaining({ appEvent: AppEventCode.ALREADY_VERIFIED })
      )
    })
  })

  describe('fileUploadErrorAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.fileUploadErrorAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.FileUploadError.Title',
        'Alerts.FileUploadError.Description',
        expect.objectContaining({ appEvent: AppEventCode.FILE_UPLOAD_ERROR })
      )
    })
  })

  describe('loginSameDeviceInvalidPairingCodeAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginSameDeviceInvalidPairingCodeAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.InvalidPairingCodeSameDevice.Title',
        'Alerts.InvalidPairingCodeSameDevice.Description',
        expect.objectContaining({ appEvent: AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE })
      )
    })
  })

  describe('missingJwkAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.missingJwkAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK })
      )
    })
  })

  describe('jwsVerificationFailedAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.jwsVerificationFailedAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_112_JWS_VERIFICATION_FAILED })
      )
    })
  })

  describe('loginServerErrorAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginServerErrorAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithLogin.Title',
        'Alerts.ProblemWithLogin.Description',
        expect.objectContaining({ appEvent: AppEventCode.LOGIN_SERVER_ERROR })
      )
    })
  })

  describe('problemWithLoginAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.problemWithLoginAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithLogin.Title',
        'Alerts.ProblemWithLogin.Description',
        expect.objectContaining({ appEvent: AppEventCode.LOGIN_PARSE_URI })
      )
    })
  })

  describe('loginRejected401Alert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected401Alert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        expect.objectContaining({ appEvent: AppEventCode.LOGIN_REJECTED_401 }),
        {
          action: {
            text: 'Alerts.ProblemWithAccount.Action1',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        }
      )
    })

    it('should navigate to the RemoveAccountConfirmation screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected401Alert()

      const options = mockEmitErrorModal.mock.calls[0][3]
      expect(options.action).toBeDefined()

      options.action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainRemoveAccountConfirmation)
    })
  })

  describe('loginRejected403Alert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected403Alert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        expect.objectContaining({ appEvent: AppEventCode.LOGIN_REJECTED_403 }),
        {
          action: {
            text: 'Alerts.ProblemWithAccount.Action1',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        }
      )
    })

    it('should navigate to the RemoveAccountConfirmation screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected403Alert()

      const options = mockEmitErrorModal.mock.calls[0][3]
      expect(options.action).toBeDefined()

      options.action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainRemoveAccountConfirmation)
    })
  })

  describe('loginRejected400Alert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected400Alert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        expect.objectContaining({ appEvent: AppEventCode.LOGIN_REJECTED_400 }),
        {
          action: {
            text: 'Alerts.ProblemWithAccount.Action1',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        }
      )
    })

    it('should navigate to the RemoveAccountConfirmation screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.loginRejected400Alert()

      const options = mockEmitErrorModal.mock.calls[0][3]
      expect(options.action).toBeDefined()

      options.action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainRemoveAccountConfirmation)
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

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.TakePhoto, {
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
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToWriteToLocalStorageAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE })
      )
    })
  })

  describe('failedToSerializeJsonAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToSerializeJsonAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON })
      )
    })
  })

  describe('tokenUnexpectedlyNullAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.tokenUnexpectedlyNullAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_119_TOKEN_UNEXPECTEDLY_NULL })
      )
    })
  })

  describe('failedToReadFromLocalStorageAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToReadFromLocalStorageAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_101_FAILED_TO_READ_LOCAL_STORAGE })
      )
    })
  })

  describe('failedToParseJwsAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToParseJwsAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_117_FAILED_TO_PARSE_JWS })
      )
    })
  })

  describe('clientRegistrationNullAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.clientRegistrationNullAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL })
      )
    })
  })

  describe('unableToDecryptIdTokenAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.unableToDecryptIdTokenAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN })
      )
    })
  })

  describe('failedToDeserializeJsonAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToDeserializeJsonAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON })
      )
    })
  })

  describe('unableToDecryptJweAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.unableToDecryptJweAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_110_UNABLE_TO_DECRYPT_JWE })
      )
    })
  })

  describe('toJsonMethodFailureAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.toJsonMethodFailureAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_120_TOJSON_METHOD_FAILURE })
      )
    })
  })

  describe('toJsonStringMethodFailureAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.toJsonStringMethodFailureAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE })
      )
    })
  })

  describe('keychainKeyExistsAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.keychainKeyExistsAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR })
      )
    })
  })

  describe('keychainKeyDoesntExistAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.keychainKeyDoesntExistAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR })
      )
    })
  })

  describe('keychainKeyGenerationAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.keychainKeyGenerationAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR })
      )
    })
  })

  describe('jwtDeviceInfoAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.jwtDeviceInfoAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR })
      )
    })
  })

  describe('clientRegistrationFailureAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.clientRegistrationFailureAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE })
      )
    })
  })

  describe('noTokensReturnedAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.noTokensReturnedAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        expect.objectContaining({ appEvent: AppEventCode.NO_TOKENS_RETURNED }),
        {
          action: {
            text: 'Alerts.ProblemWithAccount.Action1',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        }
      )
    })

    it('should navigate to the RemoveAccountConfirmation screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.noTokensReturnedAlert()

      const options = mockEmitErrorModal.mock.calls[0][3]
      expect(options.action).toBeDefined()

      options.action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainRemoveAccountConfirmation)
    })
  })

  describe('invalidTokenAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.invalidTokenAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        expect.objectContaining({ appEvent: AppEventCode.INVALID_TOKEN }),
        {
          action: {
            text: 'Alerts.ProblemWithAccount.Action1',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        }
      )
    })

    it('should navigate to the RemoveAccountConfirmation screen when the action is pressed', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.invalidTokenAlert()

      const options = mockEmitErrorModal.mock.calls[0][3]
      expect(options.action).toBeDefined()

      options.action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainRemoveAccountConfirmation)
    })
  })

  describe('failedToRetrieveStringResourceAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToRetrieveStringResourceAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE })
      )
    })
  })

  describe('invalidUrlAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.invalidUrlAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_500_INVALID_URL })
      )
    })
  })

  describe('invalidRegistrationRequestAlert', () => {
    it('should show an error modal with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitAlert = jest.fn()
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.invalidRegistrationRequestAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithApp.Title',
        'Alerts.ProblemWithApp.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST })
      )
    })
  })

  describe('factoryResetAlert', () => {
    it('should show an alert with the correct title and message', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.factoryResetAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.FactoryReset.Title',
        'Alerts.FactoryReset.Description',
        expect.objectContaining({ appEvent: AppEventCode.FATAL_UNRECOVERABLE_ERROR }),
        {
          action: {
            text: 'Alerts.FactoryReset.Action1',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        }
      )
    })

    it('onPress should factory reset the app', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      const mockFactoryReset = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)
      jest.spyOn(useFactoryResetModule, 'useFactoryReset').mockReturnValue(mockFactoryReset as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.factoryResetAlert()

      const options = mockEmitErrorModal.mock.calls[0][3]
      expect(options.action).toBeDefined()

      options.action.onPress()

      expect(mockFactoryReset).toHaveBeenCalled()
    })
  })

  describe('IAS error alerts (201–300)', () => {
    describe('serverConfigurationAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.serverConfigurationAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithService.Title',
          'Alerts.ProblemWithService.Description',
          expect.objectContaining({ appEvent: AppEventCode.ADD_CARD_SERVER_CONFIGURATION })
        )
      })
    })

    describe('dynamicRegistrationErrorAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() }
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.dynamicRegistrationErrorAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.DynamicRegistrationError.Title',
          'Alerts.DynamicRegistrationError.Description',
          expect.objectContaining({ appEvent: AppEventCode.ADD_CARD_DYNAMIC_REGISTRATION })
        )
      })
    })

    describe('termsOfUseErrorAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() }
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.termsOfUseErrorAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithService.Title',
          'Alerts.ProblemWithService.Description',
          expect.objectContaining({ appEvent: AppEventCode.ADD_CARD_TERMS_OF_USE })
        )
      })
    })

    describe('incorrectOsAlert', () => {
      it('should show an alert with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() }
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.incorrectOsAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithService.Title',
          'Alerts.ProblemWithService.Description',
          expect.objectContaining({ appEvent: AppEventCode.ADD_CARD_INCORRECT_OS })
        )
      })
    })

    describe('addCardNotAvailableAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.addCardNotAvailableAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.AddCardNotAvailable.Title',
          'Alerts.AddCardNotAvailable.Description',
          expect.objectContaining({ appEvent: AppEventCode.ADD_CARD_PROVIDER })
        )
      })
    })

    describe('missingJsonValuesAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.missingJsonValuesAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE })
        )
      })
    })

    describe('signClaimsErrorAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.signClaimsErrorAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET })
        )
      })
    })

    describe('unexpectedNetworkCallAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.unexpectedNetworkCallAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_208_UNEXPECTED_NETWORK_CALL_EXCEPTION })
        )
      })
    })

    describe('badRequestAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.badRequestAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_209_BAD_REQUEST })
        )
      })
    })

    describe('unauthorizedAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.unauthorizedAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_210_UNAUTHORIZED })
        )
      })
    })

    describe('serverOutageAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.serverOutageAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_211_SERVER_OUTAGE })
        )
      })
    })

    describe('retryLaterAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.retryLaterAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_212_RETRY_LATER })
        )
      })
    })

    describe('creatingClientRegistrationFailedAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.creatingClientRegistrationFailedAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_213_FAILED_CREATING_CLIENT_REGISTRATION })
        )
      })
    })

    describe('keysOutOfSyncAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.keysOutOfSyncAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_299_KEYS_OUT_OF_SYNC })
        )
      })
    })

    describe('emptyResponseAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.emptyResponseAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.ProblemWithApp.Title',
          'Alerts.ProblemWithApp.Description',
          expect.objectContaining({ appEvent: AppEventCode.ERR_300_EMPTY_RESPONSE })
        )
      })
    })

    describe('deviceAuthenticationErrorAlert', () => {
      it('should show an error modal with the correct title and message', () => {
        const mockNavigation = { navigate: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))
        result.current.deviceAuthenticationErrorAlert()

        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'Alerts.DeviceAuthenticationError.Title',
          'Alerts.DeviceAuthenticationError.Description',
          expect.objectContaining({ appEvent: AppEventCode.DEVICE_AUTHENTICATION_ERROR })
        )
      })
    })
  })
})
