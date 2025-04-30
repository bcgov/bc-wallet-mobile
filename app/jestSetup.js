/* eslint-disable no-undef */
import 'reflect-metadata'
import 'react-native-gesture-handler/jestSetup'
import mockRNLocalize from 'react-native-localize/mock'
import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock'
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock'
import mockRNCNetInfo from '@react-native-community/netinfo/jest/netinfo-mock.js'
import React from 'react'
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
jest.mock('@bifold/react-native-attestation', () => ({}))
jest.mock('@hyperledger/anoncreds-react-native', () => ({}))
jest.mock('@hyperledger/aries-askar-react-native', () => ({}))
jest.mock('@hyperledger/indy-vdr-react-native', () => ({}))
