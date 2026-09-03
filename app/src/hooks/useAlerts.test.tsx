import * as useFactoryResetModule from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import * as ErrorAlertContext from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { mockAppError } from '@mocks/helpers/error'
import { CommonActions } from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'
import RN, { Platform } from 'react-native'
import { showErrorAlert, useAlerts } from './useAlerts'

jest.mock('@/bcsc-theme/api/hooks/useFactoryReset')

const mockUseStore = jest.fn()
const mockUseServices = jest.fn()

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

jest.mock('@/utils/analytics/analytics-singleton', () => ({
  Analytics: {
    trackAlertDisplayEvent: jest.fn(),
    trackErrorEvent: jest.fn(),
    trackAlertActionEvent: jest.fn(),
    trackScreenEvent: jest.fn(),
  },
}))

describe('useAlerts', () => {
  const originalPlatformOS = Platform.OS

  beforeEach(() => {
    mockUseStore.mockReturnValue([{}, jest.fn()])
    mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn(), warn: jest.fn() }])
  })

  afterEach(() => {
    Platform.OS = originalPlatformOS
  })

  it.each<[string, string, string, AppEventCode]>([
    [
      'problemWithAppAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.GENERAL,
    ],
    [
      'unsecuredNetworkAlert',
      'Alerts.UnsecuredNetwork.Title',
      'Alerts.UnsecuredNetwork.Description',
      AppEventCode.UNSECURED_NETWORK,
    ],
    [
      'serverTimeoutAlert',
      'Alerts.ServerTimeout.Title',
      'Alerts.ServerTimeout.Description',
      AppEventCode.SERVER_TIMEOUT,
    ],
    ['serverErrorAlert', 'Alerts.ServerError.Title', 'Alerts.ServerError.Description', AppEventCode.SERVER_ERROR],
    [
      'tooManyAttemptsAlert',
      'Alerts.TooManyAttempts.Title',
      'Alerts.TooManyAttempts.Description',
      AppEventCode.TOO_MANY_ATTEMPTS,
    ],
    [
      'verificationNotCompleteAlert',
      'Alerts.VerificationNotComplete.Title',
      'Alerts.VerificationNotComplete.Description',
      AppEventCode.VERIFY_NOT_COMPLETE,
    ],
    [
      'invalidPairingCodeAlert',
      'Alerts.InvalidPairingCode.Title',
      'Alerts.InvalidPairingCode.Description',
      AppEventCode.INVALID_PAIRING_CODE,
    ],
    [
      'alreadyVerifiedAlert',
      'Alerts.AlreadyVerified.Title',
      'Alerts.AlreadyVerified.Description',
      AppEventCode.ALREADY_VERIFIED,
    ],
    [
      'fileUploadErrorAlert',
      'Alerts.FileUploadError.Title',
      'Alerts.FileUploadError.Description',
      AppEventCode.FILE_UPLOAD_ERROR,
    ],
    [
      'videoPromptsMissingAlert',
      'Alerts.VideoPromptsMissing.Title',
      'Alerts.VideoPromptsMissing.Description',
      AppEventCode.VIDEO_PROMPTS_MISSING,
    ],
    [
      'loginSameDeviceInvalidPairingCodeAlert',
      'Alerts.InvalidPairingCodeSameDevice.Title',
      'Alerts.InvalidPairingCodeSameDevice.Description',
      AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
    ],
    [
      'missingJwkAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK,
    ],
    [
      'jwsVerificationFailedAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_112_JWS_VERIFICATION_FAILED,
    ],
    [
      'loginServerErrorAlert',
      'Alerts.ProblemWithLogin.Title',
      'Alerts.ProblemWithLogin.Description',
      AppEventCode.LOGIN_SERVER_ERROR,
    ],
    [
      'problemWithLoginAlert',
      'Alerts.ProblemWithLogin.Title',
      'Alerts.ProblemWithLogin.Description',
      AppEventCode.LOGIN_PARSE_URI,
    ],
    [
      'failedToSerializeJsonAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON,
    ],
    [
      'tokenUnexpectedlyNullAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_119_TOKEN_UNEXPECTEDLY_NULL,
    ],
    [
      'failedToReadFromLocalStorageAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_101_FAILED_TO_READ_LOCAL_STORAGE,
    ],
    [
      'failedToParseJwsAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_117_FAILED_TO_PARSE_JWS,
    ],
    [
      'clientRegistrationNullAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL,
    ],
    [
      'unableToDecryptIdTokenAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN,
    ],
    [
      'failedToDeserializeJsonAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON,
    ],
    [
      'unableToDecryptJweAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_110_UNABLE_TO_DECRYPT_JWE,
    ],
    [
      'toJsonMethodFailureAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_120_TOJSON_METHOD_FAILURE,
    ],
    [
      'toJsonStringMethodFailureAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE,
    ],
    [
      'keychainKeyExistsAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR,
    ],
    [
      'keychainKeyDoesntExistAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR,
    ],
    [
      'keychainUnavailableAlert',
      'Alerts.KeychainUnavailable.Title',
      'Alerts.KeychainUnavailable.Description',
      AppEventCode.ERR_120_KEYCHAIN_UNAVAILABLE_ERROR,
    ],
    [
      'keychainKeyGenerationAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR,
    ],
    [
      'jwtDeviceInfoAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR,
    ],
    [
      'clientRegistrationFailureAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE,
    ],
    [
      'failedToRetrieveStringResourceAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE,
    ],
    [
      'invalidUrlAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_500_INVALID_URL,
    ],
    [
      'invalidRegistrationRequestAlert',
      'Alerts.SomethingWentWrong.Title',
      'Alerts.SomethingWentWrong.Description',
      AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST,
    ],
  ])('%s should show an error modal with the correct title and message', (method, title, description, appEvent) => {
    const mockEmitErrorModal = jest.fn()
    jest
      .spyOn(ErrorAlertContext, 'useErrorAlert')
      .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

    const { result } = renderHook(() => useAlerts({ navigate: jest.fn() } as any))

    ;(result.current as unknown as Record<string, () => void>)[method]()

    expect(mockEmitErrorModal).toHaveBeenCalledWith(title, description, expect.objectContaining({ appEvent }))
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

  describe('personCredentialSuspendedAlert', () => {
    it('should show the generic Problem with Account modal with errorCode 3205', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.personCredentialSuspendedAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        expect.objectContaining({ appEvent: AppEventCode.AUTO_CRED_ACCOUNT_SUSPENDED }),
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

      result.current.personCredentialSuspendedAlert()

      const options = mockEmitErrorModal.mock.calls[0][3]
      expect(options.action).toBeDefined()

      options.action.onPress()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainRemoveAccountConfirmation)
    })
  })

  describe('personCredentialDeactivatedAlert', () => {
    it('should show the generic Problem with Account modal with errorCode 3206', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.personCredentialDeactivatedAlert()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.ProblemWithAccount.Title',
        'Alerts.ProblemWithAccount.Description',
        expect.objectContaining({ appEvent: AppEventCode.AUTO_CRED_ACCOUNT_DEACTIVATED }),
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

      result.current.personCredentialDeactivatedAlert()

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

    it('should reset navigation to VerificationMethodSelection when OK is pressed', () => {
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
          index: 0,
          routes: [{ name: BCSCScreens.VerificationMethodSelection }],
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
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE })
      )
    })

    it('should keep the generic copy for a write failure unrelated to disk space', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToWriteToLocalStorageAlert(new Error('keychain unavailable'))

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        expect.objectContaining({ appEvent: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE })
      )
    })

    it('should show actionable storage-full copy when the device is out of disk space (iOS)', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      // Message shape thrown by react-native-vision-camera on iOS when the volume is full
      result.current.failedToWriteToLocalStorageAlert(
        new Error(
          'An unexpected File IO error occurred! Error: You can\'t save the file "photo.jpg" because the volume "User" is out of space.'
        )
      )

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.DeviceStorageFull.Title',
        'Alerts.DeviceStorageFull.Description',
        expect.objectContaining({ appEvent: AppEventCode.DEVICE_STORAGE_FULL })
      )
    })

    it('should show actionable storage-full copy when the device is out of disk space (Android ENOSPC)', () => {
      const mockNavigation = { navigate: jest.fn() }
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts(mockNavigation as any))

      result.current.failedToWriteToLocalStorageAlert(
        new Error('An unexpected File IO error occurred! Error: write failed: ENOSPC (No space left on device).')
      )

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Alerts.DeviceStorageFull.Title',
        'Alerts.DeviceStorageFull.Description',
        expect.objectContaining({ appEvent: AppEventCode.DEVICE_STORAGE_FULL })
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
    it.each<[string, string, string, AppEventCode]>([
      [
        'serverConfigurationAlert',
        'Alerts.ProblemWithService.Title',
        'Alerts.ProblemWithService.Description',
        AppEventCode.ADD_CARD_SERVER_CONFIGURATION,
      ],
      [
        'addCardNotAvailableAlert',
        'Alerts.AddCardNotAvailable.Title',
        'Alerts.AddCardNotAvailable.Description',
        AppEventCode.ADD_CARD_PROVIDER,
      ],
      [
        'missingJsonValuesAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE,
      ],
      [
        'signClaimsErrorAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET,
      ],
      [
        'unexpectedNetworkCallAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_208_UNEXPECTED_NETWORK_CALL_EXCEPTION,
      ],
      ['badRequestAlert', 'Alerts.BadRequest.Title', 'Alerts.BadRequest.Description', AppEventCode.ERR_209_BAD_REQUEST],
      [
        'unauthorizedAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_210_UNAUTHORIZED,
      ],
      [
        'serverOutageAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_211_SERVER_OUTAGE,
      ],
      [
        'retryLaterAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_212_RETRY_LATER,
      ],
      [
        'creatingClientRegistrationFailedAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_213_FAILED_CREATING_CLIENT_REGISTRATION,
      ],
      [
        'keysOutOfSyncAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_299_KEYS_OUT_OF_SYNC,
      ],
      [
        'emptyResponseAlert',
        'Alerts.SomethingWentWrong.Title',
        'Alerts.SomethingWentWrong.Description',
        AppEventCode.ERR_300_EMPTY_RESPONSE,
      ],
    ])('%s should show an error modal with the correct title and message', (method, title, description, appEvent) => {
      const mockEmitErrorModal = jest.fn()
      jest
        .spyOn(ErrorAlertContext, 'useErrorAlert')
        .mockReturnValue({ emitAlert: jest.fn(), emitErrorModal: mockEmitErrorModal } as any)

      const { result } = renderHook(() => useAlerts({ navigate: jest.fn() } as any))

      ;(result.current as unknown as Record<string, () => void>)[method]()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(title, description, expect.objectContaining({ appEvent }))
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

    describe('unsupportedOsAlert', () => {
      it('should show a basic alert (no error modal) with the unsupported OS copy', () => {
        const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() }
        const mockEmitAlert = jest.fn()
        const mockEmitErrorModal = jest.fn()
        jest
          .spyOn(ErrorAlertContext, 'useErrorAlert')
          .mockReturnValue({ emitAlert: mockEmitAlert, emitErrorModal: mockEmitErrorModal } as any)

        const { result } = renderHook(() => useAlerts(mockNavigation as any))

        result.current.unsupportedOsAlert()

        expect(mockEmitAlert).toHaveBeenCalledWith(
          'Alerts.DynamicRegistrationError.Title',
          'Alerts.DynamicRegistrationError.Description',
          expect.objectContaining({ event: AppEventCode.ADD_CARD_DYNAMIC_REGISTRATION })
        )
        expect(mockEmitErrorModal).not.toHaveBeenCalled()
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
          'Alerts.DynamicRegistrationError.Title',
          'Alerts.DynamicRegistrationError.Description',
          expect.objectContaining({ appEvent: AppEventCode.ADD_CARD_INCORRECT_OS })
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

  describe('showErrorAlert', () => {
    it('should call the mapped alert for an app event in the HTTP alert map', () => {
      const mockServerErrorAlert = jest.fn()
      const mockUnknownErrorModal = jest.fn()
      const alerts = { serverErrorAlert: mockServerErrorAlert, unknownErrorModal: mockUnknownErrorModal } as any
      const error = mockAppError(AppEventCode.SERVER_ERROR)

      showErrorAlert(error, alerts)

      expect(mockServerErrorAlert).toHaveBeenCalledWith(error)
      expect(mockUnknownErrorModal).not.toHaveBeenCalled()
    })

    it('should call the mapped alert for an app event in the IAS alert map', () => {
      const mockForbiddenAlert = jest.fn()
      const mockUnknownErrorModal = jest.fn()
      const alerts = { forbiddenAlert: mockForbiddenAlert, unknownErrorModal: mockUnknownErrorModal } as any
      const error = mockAppError(AppEventCode.FORBIDDEN)

      showErrorAlert(error, alerts)

      expect(mockForbiddenAlert).toHaveBeenCalledWith(error)
      expect(mockUnknownErrorModal).not.toHaveBeenCalled()
    })

    it('should fall back to the unknown error modal for a non-AppError', () => {
      const mockUnknownErrorModal = jest.fn()
      const alerts = { unknownErrorModal: mockUnknownErrorModal } as any
      const error = new Error('Unexpected failure')

      showErrorAlert(error, alerts)

      expect(mockUnknownErrorModal).toHaveBeenCalledWith(error)
    })

    it('should fall back to the unknown error modal for an AppError whose app event is not in either alert map', () => {
      const mockUnknownErrorModal = jest.fn()
      const alerts = { unknownErrorModal: mockUnknownErrorModal } as any
      const error = mockAppError(AppEventCode.GENERAL)

      showErrorAlert(error, alerts)

      expect(mockUnknownErrorModal).toHaveBeenCalledWith(error)
    })

    it('should fall back to the unknown error modal when the mapped alert is not defined on the given alerts object', () => {
      const mockUnknownErrorModal = jest.fn()
      // serverErrorAlert intentionally omitted, even though SERVER_ERROR is a recognized app event
      const alerts = { unknownErrorModal: mockUnknownErrorModal } as any
      const error = mockAppError(AppEventCode.SERVER_ERROR)

      showErrorAlert(error, alerts)

      expect(mockUnknownErrorModal).toHaveBeenCalledWith(error)
    })
  })
})
