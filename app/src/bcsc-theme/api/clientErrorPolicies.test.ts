import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { BCSCScreens } from '../types/navigators'
import { globalAlertErrorPolicy, noTokensReturnedErrorPolicy } from './clientErrorPolicies'

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
        noTokensReturnedErrorPolicy.handle(error, context as any)

        expect(emitErrorAlertMock).toHaveBeenCalledTimes(1)

        const alertArgs = emitErrorAlertMock.mock.calls[0]

        const alertActions = alertArgs[1]?.actions

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
})
