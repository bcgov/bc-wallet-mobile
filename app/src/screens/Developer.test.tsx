import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { Mode } from '@/constants'
import { AuthProvider, testIdWithKey, TOKENS, useServices } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { deleteToken, TokenType } from 'react-native-bcsc-core'
import Developer from './Developer'

jest.mock('react-native-bcsc-core')
jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useServices: jest.fn(),
}))

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient', () => ({
  ...jest.requireActual('@/bcsc-theme/hooks/useBCSCApiClient'),
  useBCSCApiClientState: jest.fn(),
}))

const mockUseServices = useServices as jest.Mock
const mockUseBCSCApiClientState = useBCSCApiClientState as jest.Mock
const mockDeleteToken = deleteToken as jest.Mock

const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), trace: jest.fn() }
const mockClearTokens = jest.fn()

describe('Developer Screen', () => {
  beforeEach(() => {
    // Silence console.error because it will print a warning about Switch
    // "Warning: dispatchCommand was called with a ref ...".
    jest.spyOn(console, 'error').mockImplementation(() => {
      return null
    })
    jest.useFakeTimers()

    mockUseServices.mockReturnValue([mockLogger])
    mockUseBCSCApiClientState.mockReturnValue({
      client: { clearTokens: mockClearTokens },
      isClientReady: true,
      error: null,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  test('screen renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <AuthProvider>
          <Developer />
        </AuthProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  test('deleteTokens deletes all token types, clears the api client, and updates state on success', async () => {
    const { getByTestId, getByText } = render(
      <BasicAppContext initialStateOverride={{ mode: Mode.BCSC }}>
        <AuthProvider>
          <Developer />
        </AuthProvider>
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('DeleteTokens')))

    await waitFor(() => {
      expect(getByText('true')).toBeTruthy()
    })

    expect(mockDeleteToken).toHaveBeenCalledWith(TokenType.Refresh)
    expect(mockDeleteToken).toHaveBeenCalledWith(TokenType.Registration)
    expect(mockDeleteToken).toHaveBeenCalledWith(TokenType.Access)
    expect(mockClearTokens).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Developer: Deleted all tokens from native storage and cleared in-memory cache'
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('deleteTokens logs an error and does not update state when a deletion fails', async () => {
    const deleteError = new Error('boom')
    mockDeleteToken.mockRejectedValueOnce(deleteError)

    const { getByTestId, queryByText } = render(
      <BasicAppContext initialStateOverride={{ mode: Mode.BCSC }}>
        <AuthProvider>
          <Developer />
        </AuthProvider>
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('DeleteTokens')))

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith('Developer: Failed to delete tokens', deleteError)
    })

    expect(mockClearTokens).not.toHaveBeenCalled()
    expect(mockLogger.info).not.toHaveBeenCalled()
    expect(queryByText('true')).toBeNull()
  })

  describe('fetchPersonCredentialTest', () => {
    const mockServiceForToken = (monitor: unknown) => {
      mockUseServices.mockImplementation((tokens: unknown[]) => {
        if (tokens[0] === TOKENS.UTIL_CREDENTIAL_PROVISIONING_MONITOR) {
          return [monitor]
        }
        return [mockLogger]
      })
    }

    const renderDeveloperScreen = () =>
      render(
        <BasicAppContext initialStateOverride={{ mode: Mode.BCSC }}>
          <AuthProvider>
            <Developer />
          </AuthProvider>
        </BasicAppContext>
      )

    test('warns and shows unavailable status when no monitor is registered', () => {
      mockServiceForToken(undefined)

      const { getByTestId, getByText } = renderDeveloperScreen()

      fireEvent.press(getByTestId(testIdWithKey('FetchPersonCredentialTest')))

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Developer: No AutoCredentialMonitor registered, cannot trigger test fetch'
      )
      expect(getByText('unavailable — monitor not registered')).toBeTruthy()
    })

    test('warns and shows unavailable status when the registered service has no triggerTestWorkflow function', () => {
      mockServiceForToken({})

      const { getByTestId, getByText } = renderDeveloperScreen()

      fireEvent.press(getByTestId(testIdWithKey('FetchPersonCredentialTest')))

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Developer: No AutoCredentialMonitor registered, cannot trigger test fetch'
      )
      expect(getByText('unavailable — monitor not registered')).toBeTruthy()
    })

    test('shows triggering status and does not warn when triggerTestWorkflow starts successfully', () => {
      const triggerTestWorkflow = jest.fn().mockReturnValue(true)
      mockServiceForToken({ triggerTestWorkflow })

      const { getByTestId, getByText } = renderDeveloperScreen()

      fireEvent.press(getByTestId(testIdWithKey('FetchPersonCredentialTest')))

      expect(triggerTestWorkflow).toHaveBeenCalledTimes(1)
      expect(getByText('triggering...')).toBeTruthy()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    test('shows not-started status when triggerTestWorkflow returns false', () => {
      const triggerTestWorkflow = jest.fn().mockReturnValue(false)
      mockServiceForToken({ triggerTestWorkflow })

      const { getByTestId, getByText } = renderDeveloperScreen()

      fireEvent.press(getByTestId(testIdWithKey('FetchPersonCredentialTest')))

      expect(triggerTestWorkflow).toHaveBeenCalledTimes(1)
      expect(getByText('not started — already in progress or agent not ready')).toBeTruthy()
    })
  })
})
