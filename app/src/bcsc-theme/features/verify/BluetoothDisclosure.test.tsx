import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { PermissionsAndroid } from 'react-native'
import { BluetoothDisclosure } from './BluetoothDisclosure'

const mockLogger = { error: jest.fn() }

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useServices: jest.fn(() => [mockLogger]),
}))

describe('BluetoothDisclosure', () => {
  const continueTestId = testIdWithKey(TestIds.verify.bluetoothDisclosure.continue)
  let requestSpy: jest.SpyInstance

  const renderScreen = (onContinue = jest.fn()) => {
    const tree = render(
      <BasicAppContext>
        <BluetoothDisclosure onContinue={onContinue} />
      </BasicAppContext>
    )

    return { ...tree, onContinue }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    requestSpy = jest.spyOn(PermissionsAndroid, 'request')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the title, description and continue button', () => {
    const { getByText, getByTestId } = renderScreen()

    expect(getByText('BCSC.BluetoothDisclosure.Title')).toBeTruthy()
    expect(getByText('BCSC.BluetoothDisclosure.Description')).toBeTruthy()
    expect(getByTestId(continueTestId)).toBeTruthy()
  })

  it('requests BLUETOOTH_CONNECT and reports true when granted', async () => {
    requestSpy.mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED)
    const { getByTestId, onContinue } = renderScreen()

    fireEvent.press(getByTestId(continueTestId))

    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(true))
    expect(requestSpy).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)
  })

  it.each([PermissionsAndroid.RESULTS.DENIED, PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN])(
    'reports false when the result is %s',
    async (result) => {
      requestSpy.mockResolvedValue(result)
      const { getByTestId, onContinue } = renderScreen()

      fireEvent.press(getByTestId(continueTestId))

      await waitFor(() => expect(onContinue).toHaveBeenCalledWith(false))
    }
  )

  it('logs the error and reports false when the request throws', async () => {
    requestSpy.mockRejectedValue(new Error('native failure'))
    const { getByTestId, onContinue } = renderScreen()

    fireEvent.press(getByTestId(continueTestId))

    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(false))
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[BluetoothDisclosure] Error requesting Bluetooth permission:',
      expect.any(Error)
    )
  })
})
