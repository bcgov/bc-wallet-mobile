import { AppError, ErrorCategory, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { BCSCScreens } from '../types/navigators'
import {
  createExpiredAppSetupErrorPolicy,
  emailVerificationCodeInvalidErrorPolicy,
  globalAlertErrorPolicy,
  noTokensReturnedErrorPolicy,
  unexpectedServerErrorPolicy,
  updateRequiredErrorPolicy,
  verifyDeviceAssertationPolicy,
} from './clientErrorPolicies'

const newError = (code: string) => {
  return new AppError('test error', 'This is a test error', {
    appEvent: code as AppEventCode,
    category: ErrorCategory.NETWORK,
    statusCode: 5000,
  })
}

describe('clientErrorPolicies', () => {
  describe('globalAlertErrorPolicy', () => {
    describe('matches()', () => {
      it('should match unsecured_network', () => {
        const error = newError('unsecured_network')
        expect(globalAlertErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should match server_timeout', () => {
        const error = newError('server_timeout')
        expect(globalAlertErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should match server_error', () => {
        const error = newError('server_error')
        expect(globalAlertErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should match too_many_attempts', () => {
        const error = newError('too_many_attempts')
        expect(globalAlertErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should NOT match no_internet (handled by custom modal)', () => {
        const error = newError('no_internet')
        expect(globalAlertErrorPolicy.matches(error, {} as any)).toBeFalsy()
      })

      it('should NOT match other errors', () => {
        const error = newError('some_other_error')
        expect(globalAlertErrorPolicy.matches(error, {} as any)).toBeFalsy()
      })

      it('should not match empty string', () => {
        const error = newError('')
        expect(globalAlertErrorPolicy.matches(error, {} as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should call emitErrorAlert with the error', () => {
        const error = newError('server_error')
        const emitErrorAlert = jest.fn()
        const context = { emitErrorAlert }
        globalAlertErrorPolicy.handle(error, context as any)
        expect(emitErrorAlert).toHaveBeenCalledWith(error)
      })
    })
  })

  describe('noTokensReturnedErrorPolicy', () => {
    describe('matches', () => {
      it('should match NO_TOKENS_RETURNED on token endpoint', () => {
        const error = newError('no_tokens_returned')
        const context = {
          endpoint: '/api/token',
          apiEndpoints: {
            token: '/api/token',
          },
        }
        expect(noTokensReturnedErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match no_tokens_returned on extended token endpoint', () => {
        const error = newError('no_tokens_returned')
        const context = {
          endpoint: '/api/token/refresh',
          apiEndpoints: {
            token: '/api/token',
          },
        }
        expect(noTokensReturnedErrorPolicy.matches(error, context as any)).toBeTruthy()
      })
    })

    describe('handle', () => {
      it('should call emitErrorAlert with actions', () => {
        const error = newError('no_tokens_returned')
        const emitErrorAlertMock = jest.fn()
        const navigationMock = jest.fn()
        const translateMock = jest.fn()
        const context = {
          emitErrorAlert: emitErrorAlertMock,
          translate: translateMock,
          navigation: { navigate: navigationMock },
        }
        translateMock.mockReturnValue('close')
        noTokensReturnedErrorPolicy.handle(error, context as any)

        expect(emitErrorAlertMock).toHaveBeenCalledTimes(1)

        const alertArgs = emitErrorAlertMock.mock.calls[0]

        const alertActions = alertArgs[1]?.actions

        expect(alertActions[0].text).toBeDefined()
        expect(alertActions[1].text).toBeDefined()

        expect(alertActions[0].style).toBe('cancel')
        expect(alertActions[1].style).toBe('destructive')

        const removeAccountOnPressAction = alertActions[1].onPress

        expect(removeAccountOnPressAction).toBeDefined()

        // Simulate pressing the "Remove Account" action
        removeAccountOnPressAction()
        expect(navigationMock).toHaveBeenCalledWith(BCSCScreens.RemoveAccountConfirmation)
      })
    })
  })

  describe('updateRequiredErrorPolicy', () => {
    describe('matches', () => {
      it('should match IOS_APP_UPDATE_REQUIRED on evidence endpoint', () => {
        const error = newError('ios_app_update_required')
        const context = {
          endpoint: '/api/evidence',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(updateRequiredErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match ANDROID_APP_UPDATE_REQUIRED on evidence endpoint', () => {
        const error = newError('android_app_update_required')
        const context = {
          endpoint: '/api/evidence',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(updateRequiredErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match IOS_APP_UPDATE_REQUIRED on other endpoint', () => {
        const error = newError('ios_app_update_required')
        const context = {
          endpoint: '/api/other',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(updateRequiredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match ANDROID_APP_UPDATE_REQUIRED on other endpoint', () => {
        const error = newError('android_app_update_required')
        const context = {
          endpoint: '/api/other',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(updateRequiredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match other errors on evidence endpoint', () => {
        const error = newError('some_other_error')
        const context = {
          endpoint: '/api/evidence',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(updateRequiredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should call emitErrorAlert with update action', () => {
        const error = newError('ios_app_update_required')
        const emitErrorAlertMock = jest.fn()
        const translateMock = jest.fn()
        const openURLMock = jest.fn()
        const linkingMock = { openURL: openURLMock }
        const context = {
          emitErrorAlert: emitErrorAlertMock,
          translate: translateMock,
          linking: linkingMock,
        }
        translateMock.mockReturnValue('Go to App Store')
        updateRequiredErrorPolicy.handle(error, context as any)

        expect(emitErrorAlertMock).toHaveBeenCalledTimes(1)

        const alertArgs = emitErrorAlertMock.mock.calls[0]

        const alertActions = alertArgs[1]?.actions

        expect(alertActions[0].text).toBe('Go to App Store')

        const goToAppStoreOnPressAction = alertActions[0].onPress

        expect(goToAppStoreOnPressAction).toBeDefined()

        // Simulate pressing the "Go to App Store" action
        goToAppStoreOnPressAction()
        expect(openURLMock).toHaveBeenCalledWith(expect.any(String))
      })
    })
  })

  describe('unexpectedServerErrorPolicy', () => {
    describe('matches', () => {
      it('should match 500 http status code', () => {
        expect(unexpectedServerErrorPolicy.matches({} as any, { statusCode: 500 } as any)).toBeTruthy()
      })

      it('should match 503 http status code', () => {
        expect(unexpectedServerErrorPolicy.matches({} as any, { statusCode: 503 } as any)).toBeTruthy()
      })

      it('should NOT match other http status codes', () => {
        expect(unexpectedServerErrorPolicy.matches({} as any, { statusCode: 400 } as any)).toBeFalsy()
        expect(unexpectedServerErrorPolicy.matches({} as any, { statusCode: 404 } as any)).toBeFalsy()
        expect(unexpectedServerErrorPolicy.matches({} as any, { statusCode: 0 } as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should emit the alert', () => {
        const originalError = AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR)
        const error = AppError.fromErrorDefinition(ErrorRegistry.UNEXPECTED_SERVER_ERROR, { cause: originalError })

        const emitErrorAlertMock = jest.fn()
        const context = {
          emitErrorAlert: emitErrorAlertMock,
        }
        unexpectedServerErrorPolicy.handle(originalError, context as any)
        expect(emitErrorAlertMock).toHaveBeenCalledWith(error)
        expect(error.cause).toBe(originalError)
      })
    })
  })

  describe('verifyDeviceAssertationPolicy', () => {
    describe('matches', () => {
      it('should match LOGIN_SERVER_ERROR on verify device endpoint', () => {
        const error = newError('login_server_error')
        const context = {
          endpoint: '/api/cardTap/v3/mobile/assertion',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertationPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match LOGIN_PARSE_URI on verify device endpoint', () => {
        const error = newError('login_parse_uri')
        const context = {
          endpoint: '/api/cardTap/v3/mobile/assertion',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertationPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match INVALID_PAIRING_CODE on verify device endpoint', () => {
        const error = newError('invalid_pairing_code')
        const context = {
          endpoint: '/api/cardTap/v3/mobile/assertion',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertationPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE on verify device endpoint', () => {})
      const error = newError('login_same_device_invalid_pairing_code')
      const context = {
        endpoint: '/api/cardTap/v3/mobile/assertion',
        apiEndpoints: {
          cardTap: '/api/cardTap',
        },
      }
      expect(verifyDeviceAssertationPolicy.matches(error, context as any)).toBeTruthy()
    })

    it('should not match invalid endpoint', () => {
      const error = newError('invalid_pairing_code')
      const context = {
        endpoint: '/api/other-endpoint',
        apiEndpoints: {
          cardTap: '/api/cardTap',
        },
      }
      expect(verifyDeviceAssertationPolicy.matches(error, context as any)).toBeFalsy()
    })

    it('should not match other error codes', () => {
      const error = newError('some_other_error')
      const context = {
        endpoint: '/api/cardTap/v3/mobile/assertion',
        apiEndpoints: {
          cardTap: '/api/cardTap',
        },
      }
      expect(verifyDeviceAssertationPolicy.matches(error, context as any)).toBeFalsy()
    })
  })

  describe('createExpiredAppSetupErrorPolicy', () => {
    describe('matches', () => {
      it('should match USER_INPUT_EXPIRED_VERIFY_REQUEST on token endpoint', () => {
        const error = newError('user_input_expired_verify_request')
        const context = {
          endpoint: '/api/token',
          apiEndpoints: {
            token: '/api/token',
          },
        }

        const resetApplicationMock = jest.fn()
        const policy = createExpiredAppSetupErrorPolicy(resetApplicationMock)

        expect(policy).toBeDefined()
        expect(policy.matches(error, context as any)).toBeTruthy()
        expect(resetApplicationMock).not.toHaveBeenCalled()
      })

      it('should NOT match USER_INPUT_EXPIRED_VERIFY_REQUEST on other endpoint', () => {
        const error = newError('user_input_expired_verify_request')
        const context = {
          endpoint: '/api/other',
          apiEndpoints: {
            token: '/api/token',
          },
        }

        const resetApplicationMock = jest.fn()
        const policy = createExpiredAppSetupErrorPolicy(resetApplicationMock)

        expect(policy).toBeDefined()
        expect(policy.matches(error, context as any)).toBeFalsy()
        expect(resetApplicationMock).not.toHaveBeenCalled()
      })
    })

    describe('handle', () => {
      it('should call resetApplication', async () => {
        const error = newError('user_input_expired_verify_request')
        const context = {
          endpoint: '/api/token',
          apiEndpoints: {
            token: '/api/token',
          },
          logger: {
            error: jest.fn(),
          },
        }

        const resetApplicationMock = jest.fn().mockResolvedValue(undefined)
        const policy = createExpiredAppSetupErrorPolicy(resetApplicationMock)

        await policy.handle(error, context as any)

        expect(resetApplicationMock).toHaveBeenCalled()
      })
    })
  })

  describe('emailVerificationCodeInvalidErrorPolicy', () => {
    describe('matches', () => {
      it('should match EMAIL_VERIFICATION_CODE_INVALID on evidence endpoint', () => {
        const error = newError('email_verification_code_invalid')
        const context = {
          endpoint: '/api/evidence',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(emailVerificationCodeInvalidErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match EMAIL_VERIFICATION_CODE_INVALID on extended evidence endpoint', () => {
        const error = newError('email_verification_code_invalid')
        const context = {
          endpoint: '/api/evidence/submit',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(emailVerificationCodeInvalidErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match EMAIL_VERIFICATION_CODE_INVALID on other endpoint', () => {
        const error = newError('email_verification_code_invalid')
        const context = {
          endpoint: '/api/other',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(emailVerificationCodeInvalidErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match other errors on evidence endpoint', () => {
        const error = newError('some_other_error')
        const context = {
          endpoint: '/api/evidence',
          apiEndpoints: {
            evidence: '/api/evidence',
          },
        }
        expect(emailVerificationCodeInvalidErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })
    describe('handle', () => {
      it('should call emitErrorAlert with the error', () => {
        const error = newError('email_verification_code_invalid')
        const emitErrorAlert = jest.fn()
        const context = { emitErrorAlert }
        emailVerificationCodeInvalidErrorPolicy.handle(error, context as any)
        expect(emitErrorAlert).toHaveBeenCalledWith(error)
      })
    })
  })
})
