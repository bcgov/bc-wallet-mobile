import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { PermissionsAndroid } from 'react-native'
import { useMicrophonePermission } from 'react-native-vision-camera'
import StartCallScreen from './StartCallScreen'

const mockGetServiceHours = jest.fn().mockResolvedValue({})

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    video: {
      getServiceHours: mockGetServiceHours,
    },
  })),
}))

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: jest.fn().mockReturnValue({ id: 'mock-device' }),
  useCameraPermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  useMicrophonePermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  useCameraFormat: jest.fn().mockReturnValue({ videoWidth: 640, videoHeight: 480, fps: 24 }),
  CameraRuntimeError: class extends Error {},
}))

const mockDeviceRequiresBluetoothPermission = jest.fn()

jest.mock('@/bcsc-theme/utils/bluetooth', () => ({
  deviceRequiresBluetoothPermission: () => mockDeviceRequiresBluetoothPermission(),
}))

describe('StartCall', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <StartCallScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
  describe('permission flow', () => {
    const startTestId = testIdWithKey(TestIds.verify.startCall.start)
    const continueTestId = testIdWithKey(TestIds.verify.bluetoothDisclosure.continue)
    const mockRequestMicrophonePermission = jest.fn()

    const renderScreen = () =>
      render(
        <BasicAppContext>
          <StartCallScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

    const mockMicrophone = (hasPermission: boolean, requestResult = hasPermission) => {
      mockRequestMicrophonePermission.mockResolvedValue(requestResult)
      jest.mocked(useMicrophonePermission).mockReturnValue({
        hasPermission,
        requestPermission: mockRequestMicrophonePermission,
      } as unknown as ReturnType<typeof useMicrophonePermission>)
    }

    beforeEach(() => {
      jest.useRealTimers()
      mockDeviceRequiresBluetoothPermission.mockResolvedValue(false)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('shows the microphone permission screen when microphone permission is denied', async () => {
      mockMicrophone(false)
      const { getByTestId, findByText } = renderScreen()

      fireEvent.press(getByTestId(startTestId))

      expect(await findByText('BCSC.PermissionDisabled.MicrophoneTitle')).toBeTruthy()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('navigates to LiveCall when microphone is granted and Bluetooth permission is not needed', async () => {
      mockMicrophone(true)
      const { getByTestId } = renderScreen()

      fireEvent.press(getByTestId(startTestId))

      await waitFor(() => expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.LiveCall))
    })

    it('shows the Bluetooth disclosure when Bluetooth permission is needed', async () => {
      mockMicrophone(true)
      mockDeviceRequiresBluetoothPermission.mockResolvedValue(true)
      const { getByTestId, findByTestId } = renderScreen()

      fireEvent.press(getByTestId(startTestId))

      expect(await findByTestId(continueTestId)).toBeTruthy()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('navigates to LiveCall after Bluetooth permission is granted from the disclosure', async () => {
      mockMicrophone(true)
      mockDeviceRequiresBluetoothPermission.mockResolvedValue(true)
      jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED)
      const { getByTestId, findByTestId } = renderScreen()

      fireEvent.press(getByTestId(startTestId))
      fireEvent.press(await findByTestId(continueTestId))

      await waitFor(() => expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.LiveCall))
    })

    it('shows the Bluetooth permission screen when permission is denied from the disclosure', async () => {
      mockMicrophone(true)
      mockDeviceRequiresBluetoothPermission.mockResolvedValue(true)
      jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED)
      const { getByTestId, findByTestId, findByText } = renderScreen()

      fireEvent.press(getByTestId(startTestId))
      fireEvent.press(await findByTestId(continueTestId))

      expect(await findByText('BCSC.PermissionDisabled.BluetoothTitle')).toBeTruthy()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })
  })
})
