/* eslint-disable no-undef */
import mockRNCNetInfo from '@react-native-community/netinfo/jest/netinfo-mock.js'
import React from 'react'
import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock'
import 'react-native-gesture-handler/jestSetup'
import mockRNLocalize from 'react-native-localize/mock'
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock'
import 'reflect-metadata'
global.React = React

mockRNDeviceInfo.getVersion = jest.fn(() => '1')
mockRNDeviceInfo.getBuildNumber = jest.fn(() => '1')

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext)
jest.mock('@react-native-community/netinfo', () => mockRNCNetInfo)
jest.mock('react-native-device-info', () => mockRNDeviceInfo)
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper')
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter')
jest.mock('react-native-localize', () => mockRNLocalize)
jest.mock('react-native-vision-camera', () => {
  return require('./__mocks__/custom/react-native-camera')
})
jest.mock('react-native-permissions', () => require('react-native-permissions/mock'))
jest.mock('react-native-splash-screen', () => ({}))
jest.mock('react-native-orientation-locker', () => {
  const mockOrientation = {
    getInitialOrientation: jest.fn(() => 'PORTRAIT'),
    lockToPortrait: jest.fn(),
    unlockAllOrientations: jest.fn(),
  }
  const OrientationType = {
    PORTRAIT: 'PORTRAIT',
    'PORTRAIT-UPSIDEDOWN': 'PORTRAIT-UPSIDEDOWN',
    LANDSCAPE: 'LANDSCAPE',
    'LANDSCAPE-LEFT': 'LANDSCAPE-LEFT',
    'LANDSCAPE-RIGHT': 'LANDSCAPE-RIGHT',
  }
  return {
    __esModule: true,
    default: mockOrientation,
    OrientationLocker: jest.fn(),
    OrientationType,
    useOrientationChange: jest.fn(),
    ...mockOrientation,
  }
})
jest.mock('@bifold/react-native-attestation', () => ({}))
jest.mock('@hyperledger/anoncreds-react-native', () => ({}))
jest.mock('@hyperledger/aries-askar-react-native', () => ({}))
jest.mock('@hyperledger/indy-vdr-react-native', () => ({}))
jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const { ScrollView } = jest.requireActual('react-native')
  return {
    KeyboardAwareScrollView: ScrollView,
  }
})
jest.mock('react-native/Libraries/Image/Image', () => {
  const actualImage = jest.requireActual('react-native/Libraries/Image/Image')
  return {
    ...actualImage,
    resolveAssetSource: jest.fn(() => ({
      uri: 'mocked-image-uri',
      width: 100,
      height: 100,
      scale: 1,
    })),
  }
})

jest.mock('./src/bcsc-theme/hooks/useBCSCApiClient', () => ({
  useBCSCApiClient: jest.fn(() => ({})),
  useBCSCApiClientState: jest.fn(() => ({})),
}))

jest.mock('./src/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    registration: {
      updateRegistration: jest.fn(),
    },
    authorization: {
      authorizeDevice: jest.fn().mockResolvedValue({
        device_code: 'mock-device-code',
        user_code: 'mock-user-code',
        verified_email: 'test@example.com',
        expires_in: 3600,
      }),
    },
    deviceAttestation: {
      verifyAttestation: jest.fn().mockResolvedValue({ success: true }),
    },
    token: {
      deviceToken: jest.fn().mockResolvedValue({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    },
  })),
}))

jest.mock('./src/bcsc-theme/api/hooks/useFactoryReset', () => ({
  useFactoryReset: jest.fn(() => jest.fn()),
}))

jest.mock('./src/bcsc-theme/contexts/BCSCAccountContext', () => ({
  useAccount: jest.fn(() => ({
    given_name: 'John',
    family_name: 'Doe',
    birthdate: '1990-01-01',
    card_expiry: '2025-12-31',
    email: 'john.doe@example.com',
    picture: null,
    fullname_formatted: 'Doe, John',
    account_expiration_date: new Date('2025-12-31'),
  })),
  BCSCAccountProvider: jest.fn(({ children }) => children),
}))
