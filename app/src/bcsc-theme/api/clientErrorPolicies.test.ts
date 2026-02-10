import { AppError, ErrorCategory, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AxiosError } from 'axios'
import { BCSCScreens } from '../types/navigators'
import {
  alreadyRegisteredErrorPolicy,
  AxiosAppError,
  birthdateLockoutErrorPolicy,
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
        it('should emit the alert', () => {
          const error = newError('invalid_pairing_code')
          const emitErrorAlertMock = jest.fn()
          const context = {
            emitErrorAlert: emitErrorAlertMock,
          }
          verifyDeviceAssertionErrorPolicy.handle(error, context as any)
          expect(emitErrorAlertMock).toHaveBeenCalledWith(error)
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

      describe('handle', () => {
        it('should emit the alert', () => {
          const error = newError('verify_not_complete')
          const emitErrorAlertMock = jest.fn()
          const context = {
            emitErrorAlert: emitErrorAlertMock,
          }
          verifyNotCompletedErrorPolicy.handle(error, context as any)
          expect(emitErrorAlertMock).toHaveBeenCalledWith(error)
        })
      })
    })
  })
})
