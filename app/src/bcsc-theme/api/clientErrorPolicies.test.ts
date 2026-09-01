import { AppError, ErrorCategory, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AxiosError } from 'axios'
import { BCSCModals, BCSCScreens } from '../types/navigators'
import {
  alreadyRegisteredErrorPolicy,
  alreadyVerifiedErrorPolicy,
  attestationPollingErrorPolicy,
  AxiosAppError,
  birthdateLockoutErrorPolicy,
  ClientErrorHandlingPolicies,
  digitalServiceCardAccountUnavailableErrorPolicy,
  emailVerificationCodeErrorPolicy,
  evidenceAlreadyApprovedErrorPolicy,
  failedToRetrieveStringResourceErrorPolicy,
  globalAlertErrorPolicy,
  iasErrorPolicy,
  invalidClientMetadataErrorPolicy,
  invalidRegistrationRequestErrorPolicy,
  invalidUrlErrorPolicy,
  noTokensReturnedErrorPolicy,
  pairingCodeErrorPolicy,
  unexpectedServerErrorPolicy,
  unsupportedOsOnAssertionErrorPolicy,
  updateRequiredErrorPolicy,
  verificationSessionExpiredErrorPolicy,
  verifyDeviceAssertionErrorPolicy,
  verifyNotCompletedErrorPolicy,
} from './clientErrorPolicies'

const newError = (code: string): AxiosAppError => {
  const err = new AppError('This is a test error', {
    appEvent: code as AppEventCode,
    category: ErrorCategory.NETWORK,
    statusCode: 5000,
  })
  err.cause = { code: 'ERR_TEST', status: 5000 } as AxiosError
  return err as AxiosAppError
}

/**
 * Single source of truth for IAS error codes 201–300: app event code string → alert method name.
 * Used for table-driven tests so every IAS error has matching policy and alert.
 */
const IAS_ERROR_TEST_CASES: Array<[appEvent: string, alertMethod: string]> = [
  ['add_card_server_configuration', 'serverConfigurationAlert'],
  ['add_card_dynamic_registration', 'dynamicRegistrationErrorAlert'],
  ['add_card_terms_of_use', 'termsOfUseErrorAlert'],
  ['add_card_incorrect_os', 'incorrectOsAlert'],
  ['add_card_provider', 'addCardNotAvailableAlert'],
  ['err_206_missing_or_null_values_in_json_response', 'missingJsonValuesAlert'],
  ['err_207_unable_to_sign_claims_set', 'signClaimsErrorAlert'],
  ['err_208_unexpected_network_call_exception', 'unexpectedNetworkCallAlert'],
  ['err_209_bad_request', 'badRequestAlert'],
  ['err_210_unauthorized', 'unauthorizedAlert'],
  ['err_211_server_outage', 'serverOutageAlert'],
  ['err_212_retry_later', 'retryLaterAlert'],
  ['err_213_failed_creating_client_registration', 'creatingClientRegistrationFailedAlert'],
  ['err_299_keys_out_of_sync', 'keysOutOfSyncAlert'],
  ['err_300_empty_response', 'emptyResponseAlert'],
]

describe('clientErrorPolicies', () => {
  describe('iasErrorPolicy', () => {
    describe('matches()', () => {
      it.each(IAS_ERROR_TEST_CASES)('should match %s', (appEvent) => {
        const error = newError(appEvent)
        expect(iasErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should NOT match non-IAS app events', () => {
        expect(iasErrorPolicy.matches(newError('no_internet'), {} as any)).toBeFalsy()
        expect(iasErrorPolicy.matches(newError('server_error'), {} as any)).toBeFalsy()
        expect(iasErrorPolicy.matches(newError('some_other_error'), {} as any)).toBeFalsy()
      })
    })

    describe('handle()', () => {
      it.each(IAS_ERROR_TEST_CASES)(
        'should call the correct alert for app event %s (alert: %s)',
        (appEvent, alertMethod) => {
          const error = newError(appEvent)
          const mockAlert = jest.fn()
          const context = { alerts: { [alertMethod]: mockAlert } }
          iasErrorPolicy.handle(error, context as any)
          expect(mockAlert).toHaveBeenCalledTimes(1)
        }
      )

      it('should log warning and not throw when alert is undefined for app event', () => {
        const error = newError('add_card_server_configuration')
        const context = {
          alerts: {},
          logger: { warn: jest.fn() },
        }
        iasErrorPolicy.handle(error, context as any)
        expect(context.logger.warn).toHaveBeenCalledWith(
          '[IasErrorPolicy] No alert defined for app event: add_card_server_configuration'
        )
      })
    })

    describe('ClientErrorHandlingPolicies find', () => {
      it.each(IAS_ERROR_TEST_CASES)('should resolve to iasErrorPolicy for %s', (appEvent) => {
        const error = newError(appEvent)
        const context = { endpoint: 'https://example.com/device/register', statusCode: 400, apiEndpoints: {} }
        const policy = ClientErrorHandlingPolicies.find((p) => p.matches(error, context as any))
        expect(policy).toBe(iasErrorPolicy)
      })
    })
  })

  describe('invalidClientMetadataErrorPolicy', () => {
    describe('matches()', () => {
      it('should match invalid_client_metadata', () => {
        const error = newError('invalid_client_metadata')
        error.code = 'invalid_client_metadata'
        expect(invalidClientMetadataErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should NOT match other errors', () => {
        const error = newError('some_other_error')
        expect(invalidClientMetadataErrorPolicy.matches(error, {} as any)).toBeFalsy()
      })
    })

    describe('handle()', () => {
      it('should show invalid client metadata alert', () => {
        const error = newError('invalid_client_metadata')
        const mockAlert = jest.fn()
        const context = { alerts: { invalidClientMetadataAlert: mockAlert } }
        invalidClientMetadataErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalledWith(error)
      })

      it('should show the unsupported OS alert (basic, no report) when technicalMessage indicates unsupported os', () => {
        const error = newError('invalid_client_metadata')
        error.cause = new Error('unsupported os version') as AxiosError
        const mockAlert = jest.fn()
        const context = { alerts: { unsupportedOsAlert: mockAlert } }
        invalidClientMetadataErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })

      it('should match the unsupported os check case-insensitively', () => {
        const error = newError('invalid_client_metadata')
        error.cause = new Error('Client registration failed: Unsupported OS Version detected') as AxiosError
        const mockAlert = jest.fn()
        const context = { alerts: { unsupportedOsAlert: mockAlert } }
        invalidClientMetadataErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })
    })
  })

  describe('unsupportedOsOnAssertionErrorPolicy', () => {
    const assertionContext = {
      endpoint: '/api/cardTap/v3/mobile/assertion',
      statusCode: 401,
      apiEndpoints: { cardTap: '/api/cardTap' },
    }

    // Build an ERR_210_UNAUTHORIZED error whose raw response body carries (or omits) the errorMessage marker.
    const unauthorizedWithErrorMessage = (errorMessage?: unknown): AxiosAppError => {
      const error = newError('err_210_unauthorized')
      error.cause = { response: { data: errorMessage === undefined ? {} : { errorMessage } } } as AxiosError
      return error
    }

    describe('matches', () => {
      it('should match a 401 on the assertion endpoint whose errorMessage indicates unsupported OS', () => {
        const error = unauthorizedWithErrorMessage('unsupported OS')
        expect(unsupportedOsOnAssertionErrorPolicy.matches(error, assertionContext as any)).toBeTruthy()
      })

      it('should match case-insensitively', () => {
        const error = unauthorizedWithErrorMessage('Unsupported OS version detected')
        expect(unsupportedOsOnAssertionErrorPolicy.matches(error, assertionContext as any)).toBeTruthy()
      })

      it('should NOT match a genuine 401 with no errorMessage marker', () => {
        const error = unauthorizedWithErrorMessage()
        expect(unsupportedOsOnAssertionErrorPolicy.matches(error, assertionContext as any)).toBeFalsy()
      })

      it('should NOT match the marker on a different endpoint', () => {
        const error = unauthorizedWithErrorMessage('unsupported OS')
        const context = { endpoint: '/api/other-endpoint', statusCode: 401, apiEndpoints: { cardTap: '/api/cardTap' } }
        expect(unsupportedOsOnAssertionErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match a non-401 error even with the marker present', () => {
        const error = newError('invalid_pairing_code')
        error.cause = { response: { data: { errorMessage: 'unsupported OS' } } } as AxiosError
        expect(unsupportedOsOnAssertionErrorPolicy.matches(error, assertionContext as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should show the unsupported OS alert', () => {
        const error = unauthorizedWithErrorMessage('unsupported OS')
        const mockAlert = jest.fn()
        const context = { alerts: { unsupportedOsAlert: mockAlert }, logger: { info: jest.fn() } }
        unsupportedOsOnAssertionErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })
    })

    describe('ClientErrorHandlingPolicies find', () => {
      it('should resolve to unsupportedOsOnAssertionErrorPolicy (before iasErrorPolicy) for an unsupported-OS 401', () => {
        const error = unauthorizedWithErrorMessage('unsupported OS')
        const policy = ClientErrorHandlingPolicies.find((p) => p.matches(error, assertionContext as any))
        expect(policy).toBe(unsupportedOsOnAssertionErrorPolicy)
      })

      it('should resolve to iasErrorPolicy for a genuine 401 with no marker (Report path preserved)', () => {
        const error = unauthorizedWithErrorMessage()
        const policy = ClientErrorHandlingPolicies.find((p) => p.matches(error, assertionContext as any))
        expect(policy).toBe(iasErrorPolicy)
      })
    })
  })

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

      it('should log warning and not throw when alert is undefined for app event', () => {
        const error = newError('server_error')
        const context = {
          alerts: {},
          logger: { warn: jest.fn() },
        }
        globalAlertErrorPolicy.handle(error, context as any)
        expect(context.logger.warn).toHaveBeenCalledWith(
          '[GlobalAlertErrorPolicy] No alert defined for app event: server_error'
        )
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
        const context = {
          alerts: { noTokensReturnedAlert: alertMock },
        }
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
        const context = {
          alerts: { appUpdateRequiredAlert: mockAlert },
        }
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
      it('should reset navigation to the current resume step', () => {
        const error = newError('err_501_invalid_registration_request')
        const dispatchMock = jest.fn()
        const loggerMock = { info: jest.fn() }
        const resumeRoute = { name: BCSCScreens.IdentitySelection }
        const context = {
          navigation: { dispatch: dispatchMock },
          logger: loggerMock,
          getResumeRoute: () => resumeRoute,
        }
        alreadyRegisteredErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[AlreadyRegisteredErrorPolicy] Device already registered, navigating to current setup step'
        )
        expect(dispatchMock).toHaveBeenCalledTimes(1)

        const dispatchArgs = dispatchMock.mock.calls[0][0]
        expect(dispatchArgs.type).toBe('RESET')
        expect(dispatchArgs.payload.index).toBe(0)
        expect(dispatchArgs.payload.routes).toEqual([resumeRoute])
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
      it('should reset navigation to BirthdateLockout screen with the resume route below it', () => {
        const error = newError('unknown_server_error')
        error.cause = new AxiosError('unknown server error', undefined, undefined, undefined, { status: 503 } as any)
        const dispatchMock = jest.fn()
        const loggerMock = { info: jest.fn() }
        const resumeRoute = { name: BCSCScreens.IdentitySelection }
        const context = {
          navigation: { dispatch: dispatchMock },
          logger: loggerMock,
          getResumeRoute: () => resumeRoute,
        }
        birthdateLockoutErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith('[BirthdateLockoutErrorPolicy] Lockout with error:', {
          error,
        })
        expect(dispatchMock).toHaveBeenCalledTimes(1)

        const dispatchArgs = dispatchMock.mock.calls[0][0]
        expect(dispatchArgs.type).toBe('RESET')
        expect(dispatchArgs.payload.index).toBe(1)
        expect(dispatchArgs.payload.routes).toEqual([resumeRoute, { name: BCSCScreens.BirthdateLockout }])
      })
    })
  })

  describe('digitalServiceCardAccountUnavailableErrorPolicy', () => {
    const credentialBase = 'https://idsit.gov.bc.ca/credentials/v1/person'

    const errorWithDescription = (description?: unknown): AxiosAppError => {
      const error = newError('unknown_server_error')
      error.cause = {
        isAxiosError: true,
        response: {
          status: 400,
          data: description === undefined ? {} : { error: 'unauthorized_client', error_description: description },
        },
      } as AxiosError
      return error
    }

    describe('matches', () => {
      it('should match a 400 on the credential endpoint with a "suspended" error_description', () => {
        const error = errorWithDescription('suspended')
        const context = {
          statusCode: 400,
          endpoint: credentialBase,
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match a 400 on the credential endpoint with a "deactivated" error_description', () => {
        const error = errorWithDescription('deactivated')
        const context = {
          statusCode: 400,
          endpoint: credentialBase,
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should match case-insensitively', () => {
        const error = errorWithDescription('Account SUSPENDED')
        const context = {
          statusCode: 400,
          endpoint: credentialBase,
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match a non-400 status code', () => {
        const error = errorWithDescription('suspended')
        const context = {
          statusCode: 401,
          endpoint: credentialBase,
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match a 400 on a different endpoint', () => {
        const error = errorWithDescription('suspended')
        const context = {
          statusCode: 400,
          endpoint: 'https://idsit.gov.bc.ca/device/barcodes',
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match when error_description does not mention suspended/deactivated', () => {
        const error = errorWithDescription('some_other_reason')
        const context = {
          statusCode: 400,
          endpoint: credentialBase,
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match when error_description is missing', () => {
        const error = errorWithDescription()
        const context = {
          statusCode: 400,
          endpoint: credentialBase,
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match when error_description is not a string', () => {
        const error = errorWithDescription({ nested: 'suspended' })
        const context = {
          statusCode: 400,
          endpoint: credentialBase,
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match when error is not "unauthorized_client", even if error_description mentions suspended/deactivated', () => {
        const error = newError('unknown_server_error')
        error.cause = {
          isAxiosError: true,
          response: { status: 400, data: { error: 'some_other_error', error_description: 'account suspended' } },
        } as AxiosError
        const context = {
          statusCode: 400,
          endpoint: credentialBase,
          apiEndpoints: { credential: credentialBase },
        }
        expect(digitalServiceCardAccountUnavailableErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('calls personCredentialSuspendedAlert for a suspended account', () => {
        const error = errorWithDescription('suspended')
        const loggerMock = { info: jest.fn() }
        const suspendedAlert = jest.fn()
        const deactivatedAlert = jest.fn()
        const context = {
          logger: loggerMock,
          alerts: {
            personCredentialSuspendedAlert: suspendedAlert,
            personCredentialDeactivatedAlert: deactivatedAlert,
          },
        }

        digitalServiceCardAccountUnavailableErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[DigitalServiceCardAccountUnavailableErrorPolicy] account suspended on Digital Services Card creation'
        )
        expect(suspendedAlert).toHaveBeenCalledWith()
        expect(deactivatedAlert).not.toHaveBeenCalled()
      })

      it('calls personCredentialDeactivatedAlert for a deactivated account', () => {
        const error = errorWithDescription('deactivated')
        const loggerMock = { info: jest.fn() }
        const suspendedAlert = jest.fn()
        const deactivatedAlert = jest.fn()
        const context = {
          logger: loggerMock,
          alerts: {
            personCredentialSuspendedAlert: suspendedAlert,
            personCredentialDeactivatedAlert: deactivatedAlert,
          },
        }

        digitalServiceCardAccountUnavailableErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[DigitalServiceCardAccountUnavailableErrorPolicy] account deactivated on Digital Services Card creation'
        )
        expect(deactivatedAlert).toHaveBeenCalledWith()
        expect(suspendedAlert).not.toHaveBeenCalled()
      })
    })

    describe('ClientErrorHandlingPolicies find', () => {
      it('should resolve to digitalServiceCardAccountUnavailableErrorPolicy for a suspended-account 400 on the credential endpoint', () => {
        const error = errorWithDescription('suspended')
        const context = { statusCode: 400, endpoint: credentialBase, apiEndpoints: { credential: credentialBase } }
        const policy = ClientErrorHandlingPolicies.find((p) => p.matches(error, context as any))
        expect(policy).toBe(digitalServiceCardAccountUnavailableErrorPolicy)
      })
    })
  })

  describe('verificationSessionExpiredErrorPolicy', () => {
    describe('matches', () => {
      it('should match a 401 on the evidence endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 401,
          endpoint: 'https://example.com/evidence/v1/verifications',
          apiEndpoints: { evidence: 'https://example.com/evidence' },
        }
        expect(verificationSessionExpiredErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match a non-401 status on the evidence endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 500,
          endpoint: 'https://example.com/evidence/v1/verifications',
          apiEndpoints: { evidence: 'https://example.com/evidence' },
        }
        expect(verificationSessionExpiredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match a 401 on a non-evidence endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 401,
          endpoint: 'https://example.com/token',
          apiEndpoints: { evidence: 'https://example.com/evidence' },
        }
        expect(verificationSessionExpiredErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('navigates to the VerificationSessionExpired modal', () => {
        const error = newError('unknown_server_error')
        const dispatchMock = jest.fn()
        const loggerMock = { info: jest.fn() }
        const context = {
          navigation: { dispatch: dispatchMock },
          logger: loggerMock,
        }

        verificationSessionExpiredErrorPolicy.handle(error, context as any)

        expect(dispatchMock).toHaveBeenCalledTimes(1)
        const dispatchArgs = dispatchMock.mock.calls[0][0]
        expect(dispatchArgs.type).toBe('NAVIGATE')
        expect(dispatchArgs.payload.name).toBe(BCSCModals.VerificationSessionExpired)
      })
    })
  })

  describe('attestationPollingErrorPolicy', () => {
    describe('matches', () => {
      it('should match 404 on attestation endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 404,
          endpoint: '/api/attestation/some-jwt-id',
          apiEndpoints: {
            attestation: '/api/attestation',
          },
        }
        expect(attestationPollingErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match 404 on other endpoints', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 404,
          endpoint: '/api/other',
          apiEndpoints: {
            attestation: '/api/attestation',
          },
        }
        expect(attestationPollingErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should match 400 on attestation endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 400,
          endpoint: '/api/attestation/some-jwt-id',
          apiEndpoints: {
            attestation: '/api/attestation',
          },
        }
        expect(attestationPollingErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match other status codes on attestation endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 500,
          endpoint: '/api/attestation/some-jwt-id',
          apiEndpoints: {
            attestation: '/api/attestation',
          },
        }
        expect(attestationPollingErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should log expected info message', () => {
        const error = newError('unknown_server_error')
        const loggerMock = { info: jest.fn() }
        const context = { logger: loggerMock }
        attestationPollingErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[AttestationPollingErrorPolicy] 400 or 404 expected during polling — attestation not yet consumed or already consumed'
        )
      })
    })
  })

  describe('evidenceAlreadyApprovedErrorPolicy', () => {
    const evidenceBase = 'https://idsit.gov.bc.ca/evidence'

    describe('matches', () => {
      it.each([
        [`${evidenceBase}/v1/photos`],
        [`${evidenceBase}/v1/videos`],
        [`${evidenceBase}/v1/documents`],
        // The IAS-hosted binary PUT target handed back by the metadata responses
        ['https://idsit.gov.bc.ca/video/v1/uploads/78be099e-0a51-48bb-8064-547755b6e2c7'],
      ])('should match 409 on the evidence upload endpoint %s', (endpoint) => {
        const error = newError('err_209_bad_request')
        const context = { statusCode: 409, endpoint, apiEndpoints: { evidence: evidenceBase } }
        expect(evidenceAlreadyApprovedErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it.each([[`${evidenceBase}/v1/verifications/abc-123`], ['https://idsit.gov.bc.ca/device/token']])(
        'should NOT match 409 on %s, so it keeps the generic modal',
        (endpoint) => {
          const error = newError('err_209_bad_request')
          const context = { statusCode: 409, endpoint, apiEndpoints: { evidence: evidenceBase } }
          expect(evidenceAlreadyApprovedErrorPolicy.matches(error, context as any)).toBeFalsy()
        }
      )

      it('should NOT match other status codes on the evidence uploads', () => {
        const error = newError('err_209_bad_request')
        const context = {
          statusCode: 400,
          endpoint: `${evidenceBase}/v1/photos`,
          apiEndpoints: { evidence: evidenceBase },
        }
        expect(evidenceAlreadyApprovedErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should log expected info message', () => {
        const error = newError('err_209_bad_request')
        const loggerMock = { info: jest.fn() }
        evidenceAlreadyApprovedErrorPolicy.handle(error, { logger: loggerMock } as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[EvidenceAlreadyApprovedErrorPolicy] Suppressing global alert — the upload catch block completes the verification'
        )
      })
    })

    describe('ClientErrorHandlingPolicies find', () => {
      // CONFLICT is mapped to badRequestAlert in the IAS alert map, so this policy must be ordered
      // ahead of iasErrorPolicy or the modal it exists to suppress would fire anyway.
      it('should resolve to evidenceAlreadyApprovedErrorPolicy ahead of iasErrorPolicy', () => {
        const error = newError('conflict')
        const context = {
          statusCode: 409,
          endpoint: `${evidenceBase}/v1/photos`,
          apiEndpoints: { evidence: evidenceBase },
        }
        const policy = ClientErrorHandlingPolicies.find((p) => p.matches(error, context as any))
        expect(policy).toBe(evidenceAlreadyApprovedErrorPolicy)
      })

      it('should still resolve a non-evidence 409 to iasErrorPolicy', () => {
        const error = newError('conflict')
        const context = {
          statusCode: 409,
          endpoint: 'https://idsit.gov.bc.ca/device/token',
          apiEndpoints: { evidence: evidenceBase },
        }
        const policy = ClientErrorHandlingPolicies.find((p) => p.matches(error, context as any))
        expect(policy).toBe(iasErrorPolicy)
      })
    })
  })

  describe('emailVerificationCodeErrorPolicy', () => {
    const evidenceBase = 'https://idsit.gov.bc.ca/evidence'

    describe('matches', () => {
      it('should match 404 on email verification PUT endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 404,
          endpoint: `${evidenceBase}/v1/emails/349802`,
          apiEndpoints: { evidence: evidenceBase },
        }
        expect(emailVerificationCodeErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match the email creation POST endpoint (no id in path)', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 400,
          endpoint: `${evidenceBase}/v1/emails`,
          apiEndpoints: { evidence: evidenceBase },
        }
        expect(emailVerificationCodeErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match other status codes on the verification endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 500,
          endpoint: `${evidenceBase}/v1/emails/349802`,
          apiEndpoints: { evidence: evidenceBase },
        }
        expect(emailVerificationCodeErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match 404 on unrelated endpoints', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 404,
          endpoint: `${evidenceBase}/v1/photos/123`,
          apiEndpoints: { evidence: evidenceBase },
        }
        expect(emailVerificationCodeErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should log expected info message', () => {
        const error = newError('unknown_server_error')
        const loggerMock = { info: jest.fn() }
        const context = { logger: loggerMock }
        emailVerificationCodeErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[EmailVerificationCodeErrorPolicy] Suppressing global alert — confirmation screen will show inline error for invalid code'
        )
      })
    })
  })

  describe('pairingCodeErrorPolicy', () => {
    const assertionBase = 'https://idsit.gov.bc.ca'

    describe('matches', () => {
      it('should match 404 on pairing code assertion endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 404,
          endpoint: `${assertionBase}/v3/mobile/assertion`,
          apiEndpoints: {},
        }
        expect(pairingCodeErrorPolicy.matches(error, context as any)).toBeTruthy()
      })

      it('should NOT match other status codes on the assertion endpoint', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 400,
          endpoint: `${assertionBase}/v3/mobile/assertion`,
          apiEndpoints: {},
        }
        expect(pairingCodeErrorPolicy.matches(error, context as any)).toBeFalsy()
      })

      it('should NOT match 404 on unrelated endpoints', () => {
        const error = newError('unknown_server_error')
        const context = {
          statusCode: 404,
          endpoint: `${assertionBase}/v1/emails/349802`,
          apiEndpoints: {},
        }
        expect(pairingCodeErrorPolicy.matches(error, context as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should log expected info message', () => {
        const error = newError('unknown_server_error')
        const loggerMock = { info: jest.fn() }
        const context = { logger: loggerMock }
        pairingCodeErrorPolicy.handle(error, context as any)

        expect(loggerMock.info).toHaveBeenCalledWith(
          '[PairingCodeErrorPolicy] Suppressing global alert — manual pairing screen will show inline error and alert for invalid pairing code'
        )
      })
    })
  })

  describe('failedToRetrieveStringResourceErrorPolicy', () => {
    describe('matches', () => {
      it('should match ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE', () => {
        const error = newError('err_400_failed_to_retrieve_string_resource')
        expect(failedToRetrieveStringResourceErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should NOT match other errors', () => {
        const error = newError('server_error')
        expect(failedToRetrieveStringResourceErrorPolicy.matches(error, {} as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should call failedToRetrieveStringResourceAlert', () => {
        const error = newError('err_400_failed_to_retrieve_string_resource')
        const mockAlert = jest.fn()
        const context = { alerts: { failedToRetrieveStringResourceAlert: mockAlert } }
        failedToRetrieveStringResourceErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })
    })
  })

  describe('invalidUrlErrorPolicy', () => {
    describe('matches', () => {
      it('should match ERR_500_INVALID_URL', () => {
        const error = newError('err_500_invalid_url')
        expect(invalidUrlErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should NOT match other errors', () => {
        const error = newError('server_error')
        expect(invalidUrlErrorPolicy.matches(error, {} as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should call invalidUrlAlert', () => {
        const error = newError('err_500_invalid_url')
        const mockAlert = jest.fn()
        const context = { alerts: { invalidUrlAlert: mockAlert } }
        invalidUrlErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
      })
    })
  })

  describe('invalidRegistrationRequestErrorPolicy', () => {
    describe('matches', () => {
      it('should match ERR_501_INVALID_REGISTRATION_REQUEST', () => {
        const error = newError('err_501_invalid_registration_request')
        expect(invalidRegistrationRequestErrorPolicy.matches(error, {} as any)).toBeTruthy()
      })

      it('should NOT match other errors', () => {
        const error = newError('server_error')
        expect(invalidRegistrationRequestErrorPolicy.matches(error, {} as any)).toBeFalsy()
      })
    })

    describe('handle', () => {
      it('should call invalidRegistrationRequestAlert', () => {
        const error = newError('err_501_invalid_registration_request')
        const mockAlert = jest.fn()
        const context = { alerts: { invalidRegistrationRequestAlert: mockAlert } }
        invalidRegistrationRequestErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalled()
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

      it('should prefer alreadyRegisteredErrorPolicy over birthdateLockoutErrorPolicy', () => {
        const error = newError('err_501_invalid_registration_request')
        const cause = new AxiosError('client is in invalid state')
        ;(cause as any).response = { status: 503 }
        error.cause = cause
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }

        // Both policies match this error; the earlier one in the array must win.
        expect(birthdateLockoutErrorPolicy.matches(error, context as any)).toBeTruthy()

        const matchedPolicy = ClientErrorHandlingPolicies.find((policy) => policy.matches(error, context as any))
        expect(matchedPolicy).toBe(alreadyRegisteredErrorPolicy)
      })

      it('should prefer alreadyRegisteredErrorPolicy over invalidRegistrationRequestErrorPolicy', () => {
        const error = newError('err_501_invalid_registration_request')
        error.cause = new AxiosError('client is in invalid state')
        const context = {
          endpoint: '/api/devicecode',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }

        expect(invalidRegistrationRequestErrorPolicy.matches(error, context as any)).toBeTruthy()

        const matchedPolicy = ClientErrorHandlingPolicies.find((policy) => policy.matches(error, context as any))
        expect(matchedPolicy).toBe(alreadyRegisteredErrorPolicy)
      })

      it.each([
        ['err_400_failed_to_retrieve_string_resource', failedToRetrieveStringResourceErrorPolicy],
        ['err_500_invalid_url', invalidUrlErrorPolicy],
        ['err_501_invalid_registration_request', invalidRegistrationRequestErrorPolicy],
      ])('should resolve %s to its own policy rather than a global fallback', (appEvent, expectedPolicy) => {
        const error = newError(appEvent as string)
        const context = { endpoint: '/api/some-endpoint', apiEndpoints: {} as any }

        const matchedPolicy = ClientErrorHandlingPolicies.find((policy) => policy.matches(error, context as any))

        expect(matchedPolicy).toBe(expectedPolicy)
        expect(matchedPolicy).not.toBe(globalAlertErrorPolicy)
      })

      it('should prefer emailVerificationCodeErrorPolicy over iasErrorPolicy on a 404 email verification endpoint', () => {
        const error = newError('err_209_bad_request')
        const context = {
          endpoint: 'https://example.com/v1/emails/abc123',
          statusCode: 404,
          apiEndpoints: {} as any,
        }

        // err_209 is in the IAS alert map, so both policies match — the email-specific policy is
        // earlier and suppresses the generic err_209 alert.
        expect(iasErrorPolicy.matches(error, context as any)).toBeTruthy()

        const matchedPolicy = ClientErrorHandlingPolicies.find((policy) => policy.matches(error, context as any))
        expect(matchedPolicy).toBe(emailVerificationCodeErrorPolicy)
      })

      it('should fall through to invalidRegistrationRequestErrorPolicy for ERR_501 without "client is in invalid"', () => {
        const error = newError('err_501_invalid_registration_request')
        error.cause = new AxiosError('some other reason')
        const context = {
          endpoint: '/api/other',
          apiEndpoints: {
            deviceAuthorization: '/api/devicecode',
          },
        }

        const matchedPolicy = ClientErrorHandlingPolicies.find((policy) => policy.matches(error, context as any))
        expect(matchedPolicy).toBe(invalidRegistrationRequestErrorPolicy)
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
      it('should emit the alert with the error it was handed', () => {
        const error = AppError.fromErrorDefinition(ErrorRegistry.SERVER_ERROR) as AxiosAppError

        const mockAlert = jest.fn()
        const context = {
          alerts: {
            serverErrorAlert: mockAlert,
          },
        }
        unexpectedServerErrorPolicy.handle(error, context as any)
        expect(mockAlert).toHaveBeenCalledWith(error)
      })
    })
  })

  describe('verifyDeviceAssertionPolicy', () => {
    describe('matches', () => {
      it.each([
        ['LOGIN_SERVER_ERROR', 'login_server_error'],
        ['LOGIN_PARSE_URI', 'login_parse_uri'],
        ['INVALID_PAIRING_CODE', 'invalid_pairing_code'],
        ['LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE', 'login_same_device_invalid_pairing_code'],
      ])('should match %s on verify device endpoint', (_name, appEvent) => {
        const error = newError(appEvent)
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
    })

    describe('handle', () => {
      it.each([
        ['login_server_error', 'loginServerErrorAlert'],
        ['login_parse_uri', 'problemWithLoginAlert'],
        ['invalid_pairing_code', 'invalidPairingCodeAlert'],
        ['login_remembered_device_invalid_pairing_code', 'invalidPairingCodeAlert'],
        ['login_same_device_invalid_pairing_code', 'loginSameDeviceInvalidPairingCodeAlert'],
      ])('should emit %s via %s', (appEvent, alertMethod) => {
        const error = newError(appEvent)
        const mockAlert = jest.fn()
        const context = {
          alerts: { [alertMethod]: mockAlert },
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

  describe('alreadyVerifiedErrorPolicy', () => {
    describe('matches', () => {
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
  })
})
