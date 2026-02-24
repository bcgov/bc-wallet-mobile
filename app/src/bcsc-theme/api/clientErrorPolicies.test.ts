import { AppError, ErrorCategory, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AxiosError } from 'axios'
import { VerificationCardError } from '../features/verify/verificationCardError'
import { BCSCScreens } from '../types/navigators'
import {
  alreadyRegisteredErrorPolicy,
  alreadyVerifiedErrorPolicy,
  AxiosAppError,
  birthdateLockoutErrorPolicy,
  cardExpiredErrorPolicy,
  ClientErrorHandlingPolicies,
  globalAlertErrorPolicy,
  noTokensReturnedErrorPolicy,
  unexpectedServerErrorPolicy,
  updateRequiredErrorPolicy,
  verifyDeviceAssertionErrorPolicy,
  verifyNotCompletedErrorPolicy,
} from './clientErrorPolicies'

const newError = (code: string): AxiosAppError => {
  const err = new AppError('test error', 'This is a test error', {
    appEvent: code as AppEventCode,
    category: ErrorCategory.NETWORK,
    statusCode: 5000,
  })
  err.cause = { code: 'ERR_TEST', status: 5000 } as AxiosError
  return err as AxiosAppError
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
      it('should show server error alert', () => {
        const error = newError('server_error')
        const mockAlert = jest.fn()
        const context = { alerts: { serverErrorAlert: mockAlert } }
        globalAlertErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })

      it('should show unsecured network alert', () => {
        const error = newError('unsecured_network')
        const mockAlert = jest.fn()
        const context = { alerts: { unsecuredNetworkAlert: mockAlert } }
        globalAlertErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })

      it('should show server timeout alert', () => {
        const error = newError('server_timeout')
        const mockAlert = jest.fn()
        const context = { alerts: { serverTimeoutAlert: mockAlert } }
        globalAlertErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })

      it('should show too many attempts alert', () => {
        const error = newError('too_many_attempts')
        const mockAlert = jest.fn()
        const context = { alerts: { tooManyAttemptsAlert: mockAlert } }
        globalAlertErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })

      it('should log warning for undefined app events', () => {
        const error = newError('undefined_event')
        const loggerMock = { warn: jest.fn() }
        const context = { logger: loggerMock }
        globalAlertErrorPolicy.handle(error, context as any)
        expect(loggerMock.warn).toHaveBeenCalledWith(
          '[GlobalAlertErrorPolicy] No alert defined for app event: undefined_event'
        )
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
      it('should call no tokens returned alert', () => {
        const error = newError('no_tokens_returned')
        const alertMock = jest.fn()
        const navigationMock = jest.fn()
        const translateMock = jest.fn()
        const context = {
          alerts: { noTokensReturnedAlert: alertMock },
          translate: translateMock,
          navigation: { navigate: navigationMock },
        }
        translateMock.mockReturnValue('close')
        noTokensReturnedErrorPolicy.handle(error, context as any)

        expect(alertMock).toHaveBeenCalled()
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
      it('should call app update required alert', () => {
        const error = newError('ios_app_update_required')
        const mockAlert = jest.fn()
        const translateMock = jest.fn()
        const openURLMock = jest.fn()
        const linkingMock = { openURL: openURLMock }
        const context = {
          alerts: { appUpdateRequiredAlert: mockAlert },
          translate: translateMock,
          linking: linkingMock,
        }
        translateMock.mockReturnValue('Go to App Store')
        updateRequiredErrorPolicy.handle(error, context as any)

        expect(mockAlert).toHaveBeenCalled()
      })
    })
  })

  describe('alreadyRegisteredErrorPolicy', () => {
    describe('matches', () => {
      it('should match ERR_501_INVALID_REGISTRATION_REQUEST with "client is in invalid" on deviceAuthorization endpoint', () => {
        const error = newError('err_501_invalid_registration_request')
        error.cause = new AxiosError('client is in invalid state')
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(alreadyRegisteredErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match ERR_501_INVALID_REGISTRATION_REQUEST without "client is in invalid" message', () => {
        const error = newError('err_501_invalid_registration_request')
        error.cause = new AxiosError('some other message')
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(alreadyRegisteredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match ERR_501_INVALID_REGISTRATION_REQUEST on different endpoint', () => {
        const error = newError('err_501_invalid_registration_request')
        error.cause = new AxiosError('client is in invalid state')
        const context = {
          endpoint: '/api/other',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(alreadyRegisteredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match other error codes on deviceAuthorization endpoint', () => {
        const error = newError('some_other_error')
        error.cause = new AxiosError('client is in invalid state')
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(alreadyRegisteredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should reset navigation to SetupSteps screen', () => {
        const error = newError('err_501_invalid_registration_request')
        const dispatchMock = jest.fn()
        const loggerMock = { info: jest.fn() }
        const context = {
          navigation: { dispatch: dispatchMock },
          logger: loggerMock,
        }
        alreadyRegisteredErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[AlreadyRegisteredErrorPolicy] Device already registered, navigating to SetupSteps screen'
        )
        expect(dispatchMock).toHaveBeenCalledTimes(1)

        const dispatchArgs = dispatchMock.mock.calls[0][0]
        expect(dispatchArgs.type).toBe('RESET')
        expect(dispatchArgs.payload.index).toBe(0)
        expect(dispatchArgs.payload.routes).toEqual([{ name: BCSCScreens.SetupSteps }])
      })
    })
  })

  describe('birthdateLockoutErrorPolicy', () => {
    describe('matches', () => {
      it('should match 503 status on deviceAuthorization endpoint', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('unknown server error', undefined, undefined, undefined, { status: 503 } as any)
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(birthdateLockoutErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match 503 status on different endpoint', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('unknown server error', undefined, undefined, undefined, { status: 503 } as any)
        const context = {
          endpoint: '/api/other',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(birthdateLockoutErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match different status code on deviceAuthorization endpoint', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('unknown server error', undefined, undefined, undefined, { status: 500 } as any)
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(birthdateLockoutErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should reset navigation to BirthdateLockout screen with SetupSteps in stack', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('unknown server error', undefined, undefined, undefined, { status: 503 } as any)
        const dispatchMock = jest.fn()
        const loggerMock = { info: jest.fn() }
        const context = {
          navigation: { dispatch: dispatchMock },
          logger: loggerMock,
        }
        birthdateLockoutErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith('[BirthdateLockoutErrorPolicy] Lockout with error:', {
          error,
        })
        expect(dispatchMock).toHaveBeenCalledTimes(1)

        const dispatchArgs = dispatchMock.mock.calls[0][0]
        expect(dispatchArgs.type).toBe('RESET')
        expect(dispatchArgs.payload.index).toBe(1)
        expect(dispatchArgs.payload.routes).toEqual([
          { name: BCSCScreens.SetupSteps },
          { name: BCSCScreens.BirthdateLockout },
        ])
      })
    })
  })

  describe('cardExpiredErrorPolicy', () => {
    describe('matches', () => {
      it('should match UNKNOWN_SERVER_ERROR with technicalMessage "card_expired" on deviceAuthorization endpoint', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('card_expired')
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(cardExpiredErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match UNKNOWN_SERVER_ERROR with different technicalMessage on deviceAuthorization endpoint', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('some_other_message')
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(cardExpiredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match UNKNOWN_SERVER_ERROR with "card_expired" on different endpoint', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('card_expired')
        const context = {
          endpoint: '/api/other',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(cardExpiredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match other error codes with "card_expired" on deviceAuthorization endpoint', () => {
        const error = newError('server_error')
        error.cause = new AxiosError('card_expired')
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }
        expect(cardExpiredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should reset navigation to VerificationCardError screen with CardExpired type', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('card_expired')
        const dispatchMock = jest.fn()
        const loggerMock = { info: jest.fn() }
        const context = {
          navigation: { dispatch: dispatchMock },
          logger: loggerMock,
        }
        cardExpiredErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[CardExpiredErrorPolicy] Card expired, navigating to VerificationCardError screen'
        )
        expect(dispatchMock).toHaveBeenCalledTimes(1)

        const dispatchArgs = dispatchMock.mock.calls[0][0]
        expect(dispatchArgs.type).toBe('RESET')
        expect(dispatchArgs.payload.index).toBe(1)
        expect(dispatchArgs.payload.routes).toEqual([
          { name: BCSCScreens.SetupSteps },
          {
            name: BCSCScreens.VerificationCardError,
            params: { errorType: VerificationCardError.CardExpired },
          },
        ])
      })
    })
  })

  describe('ClientErrorHandlingPolicies', () => {
    describe('policy order', () => {
      it('should respect policy order when multiple policies match', () => {
        // Create an error that would match both alreadyRegisteredErrorPolicy and globalAlertErrorPolicy
        // if we artificially make globalAlertErrorPolicy match on ERR_501
        const error = newError('err_501_invalid_registration_request')
        error.cause = new AxiosError('client is in invalid state')
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }

        // Find the first matching policy
        const matchedPolicy = ClientErrorHandlingPolicies.find((policy) => policy.matches(error, context as any))

        // Should be alreadyRegisteredErrorPolicy (first in array) not globalAlertErrorPolicy
        expect(matchedPolicy).toBe(alreadyRegisteredErrorPolicy)
      })

      it('should use the first matching policy in the array', () => {
        const error = newError('server_error') // Matches globalAlertErrorPolicy
        const context = {
          endpoint: '/api/some-endpoint',
          apiEndpoints: {} as any,
        }

        const matchedPolicy = ClientErrorHandlingPolicies.find((policy) => policy.matches(error, context as any))

        // Should be globalAlertErrorPolicy
        expect(matchedPolicy).toBe(globalAlertErrorPolicy)
      })

      it('should have alreadyRegisteredErrorPolicy before other policies', () => {
        const indexOfAlreadyRegistered = ClientErrorHandlingPolicies.indexOf(alreadyRegisteredErrorPolicy)
        const indexOfBirthdateLockout = ClientErrorHandlingPolicies.indexOf(birthdateLockoutErrorPolicy)
        const indexOfGlobalAlert = ClientErrorHandlingPolicies.indexOf(globalAlertErrorPolicy)

        // alreadyRegisteredErrorPolicy should come before birthdateLockoutErrorPolicy
        expect(indexOfAlreadyRegistered).toBeLessThan(indexOfBirthdateLockout)

        // alreadyRegisteredErrorPolicy should come before globalAlertErrorPolicy
        expect(indexOfAlreadyRegistered).toBeLessThan(indexOfGlobalAlert)
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
        const originalError = AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR) as AxiosAppError
        const error = AppError.fromErrorDefinition(ErrorRegistry.SERVER_ERROR, { cause: originalError })

        const mockAlert = jest.fn()
        const context = {
          alerts: {
            serverErrorAlert: mockAlert,
          },
        }
        unexpectedServerErrorPolicy.handle(originalError, context as any)
        expect(mockAlert).toHaveBeenCalled()
        expect(error.cause).toBe(originalError)
      })
    })
  })

  describe('verifyDeviceAssertionPolicy', () => {
    describe('matches', () => {
      it('should match LOGIN_SERVER_ERROR on verify device endpoint', () => {
        const error = newError('login_server_error')
        const context = {
          endpoint: '/api/cardTap/v3/mobile/assertion',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertionErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match LOGIN_PARSE_URI on verify device endpoint', () => {
        const error = newError('login_parse_uri')
        const context = {
          endpoint: '/api/cardTap/v3/mobile/assertion',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertionErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match INVALID_PAIRING_CODE on verify device endpoint', () => {
        const error = newError('invalid_pairing_code')
        const context = {
          endpoint: '/api/cardTap/v3/mobile/assertion',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertionErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE on verify device endpoint', () => {
        const error = newError('login_same_device_invalid_pairing_code')
        const context = {
          endpoint: '/api/cardTap/v3/mobile/assertion',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertionErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should not match invalid endpoint', () => {
        const error = newError('invalid_pairing_code')
        const context = {
          endpoint: '/api/other-endpoint',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertionErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should not match other error codes', () => {
        const error = newError('some_other_error')
        const context = {
          endpoint: '/api/cardTap/v3/mobile/assertion',
          apiEndpoints: {
            cardTap: '/api/cardTap',
          },
        }
        expect(verifyDeviceAssertionErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      describe('handle', () => {
        it('should emit the login server error alert', () => {
          const error = newError('login_server_error')
          const mockAlert = jest.fn()
          const context = {
            alerts: { loginServerErrorAlert: mockAlert },
          }
          verifyDeviceAssertionErrorPolicy.handle(error, context as any)
          expect(mockAlert).toHaveBeenCalled()
        })

        it('should emit the problem with account alert', () => {
          const error = newError('login_parse_uri')
          const mockAlert = jest.fn()
          const context = {
            alerts: { problemWithLoginAlert: mockAlert },
          }
          verifyDeviceAssertionErrorPolicy.handle(error, context as any)
          expect(mockAlert).toHaveBeenCalled()
        })

        it('should emit the invalid pairing code alert', () => {
          const error = newError('invalid_pairing_code')
          const mockAlert = jest.fn()
          const context = {
            alerts: { invalidPairingCodeAlert: mockAlert },
          }
          verifyDeviceAssertionErrorPolicy.handle(error, context as any)
          expect(mockAlert).toHaveBeenCalled()
        })

        it('should emit the login remembered pairing code code alert', () => {
          const error = newError('login_remembered_device_invalid_pairing_code')
          const mockAlert = jest.fn()
          const context = {
            alerts: { invalidPairingCodeAlert: mockAlert },
          }
          verifyDeviceAssertionErrorPolicy.handle(error, context as any)
          expect(mockAlert).toHaveBeenCalled()
        })

        it('should emit the login remembered device invalid pairing code alert', () => {
          const error = newError('login_same_device_invalid_pairing_code')
          const mockAlert = jest.fn()
          const context = {
            alerts: { loginSameDeviceInvalidPairingCodeAlert: mockAlert },
          }
          verifyDeviceAssertionErrorPolicy.handle(error, context as any)
          expect(mockAlert).toHaveBeenCalled()
        })
      })
    })

    describe('verifyNotCompletedErrorPolicy', () => {
      describe('matches', () => {
        it('should match VERIFY_NOT_COMPLETE on token endpoint', () => {
          const error = newError('verify_not_complete')
          const context = {
            endpoint: '/api/token',
            apiEndpoints: {
              token: '/api/token',
            },
          }
          expect(verifyNotCompletedErrorPolicy.matches(error, context as any)).toBeTruthy()
        })

        it('should NOT match USER_INPUT_EXPIRED_VERIFY_REQUEST on other endpoint', () => {
          const error = newError('verify_not_complete')
          const context = {
            endpoint: '/api/other',
            apiEndpoints: {
              token: '/api/token',
            },
          }
          expect(verifyNotCompletedErrorPolicy.matches(error, context as any)).toBeFalsy()
        })

        it('should NOT match other error codes', () => {
          const error = newError('some_other_error')
          const context = {
            endpoint: '/api/token',
            apiEndpoints: {
              token: '/api/token',
            },
          }
          expect(verifyNotCompletedErrorPolicy.matches(error, context as any)).toBeFalsy()
        })
      })

      describe('alreadyVerifiedErrorPolicy', () => {
        it('should match ALREADY_VERIFIED on token endpoint', () => {
          const error = newError('already_verified')
          const context = {
            endpoint: '/api/token',
            apiEndpoints: {
              token: '/api/token',
            },
          }
          expect(alreadyVerifiedErrorPolicy.matches(error, context as any)).toBeTruthy()
        })

        it('should NOT match ALREADY_VERIFIED on other endpoint', () => {
          const error = newError('already_verified')
          const context = {
            endpoint: '/api/other',
            apiEndpoints: {
              token: '/api/token',
            },
          }
          expect(alreadyVerifiedErrorPolicy.matches(error, context as any)).toBeFalsy()
        })

        it('should NOT match other error codes', () => {
          const error = newError('some_other_error')
          const context = {
            endpoint: '/api/token',
            apiEndpoints: {
              token: '/api/token',
            },
          }
          expect(alreadyVerifiedErrorPolicy.matches(error, context as any)).toBeFalsy()
        })
      })

      describe('handle', () => {
        it('should emit the alert', () => {
          const error = newError('verify_not_complete')
          const mockAlert = jest.fn()
          const context = {
            alerts: { verificationNotCompleteAlert: mockAlert },
          }
          verifyNotCompletedErrorPolicy.handle(error, context as any)
          expect(mockAlert).toHaveBeenCalled()
        })
      })
    })
  })
})
