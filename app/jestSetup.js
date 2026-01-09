/* eslint-disable no-undef */
import mockRNCNetInfo from '@react-native-community/netinfo/jest/netinfo-mock.js'
import React from 'react'
import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock'
import 'react-native-gesture-handler/jestSetup'
import mockRNLocalize from 'react-native-localize/mock'
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock'
import 'reflect-metadata'
global.React = React

// =============================================================================
// Console Output Suppression for Cleaner Test Output
// =============================================================================

// Store original console methods
// eslint-disable-next-line no-console
const originalConsole = { log: console.log, warn: console.warn, error: console.error }

// Patterns to suppress (common expected log messages during tests)
const suppressedPatterns = [
  /RefreshOrchestrator/,
  /\[Refresh\]/,
  /initialized ->/,
  /PIN set successfully/,
]

// Patterns for React warnings that are expected in tests
const expectedReactWarnings = [
  /An update to .* inside a test was not wrapped in act/,
  /Cannot update a component .* while rendering a different component/,
  /Function components cannot be given refs/,
  /The above error occurred in the <.*> component/,
  /Consider adding an error boundary to your tree/,
]

/**
 * Creates a filtered console method that suppresses known noisy messages.
 * Set JEST_VERBOSE_LOGS=1 to see all logs during debugging.
 */
const createFilteredConsole = (method, patterns) => {
  return (...args) => {
    // Allow verbose mode for debugging
    if (process.env.JEST_VERBOSE_LOGS === '1') {
      originalConsole[method](...args)
      return
    }

    const message = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')

    // Check if message matches any suppressed pattern
    const shouldSuppress = patterns.some((pattern) => pattern.test(message))
    if (!shouldSuppress) {
      originalConsole[method](...args)
    }
  }
}

// Apply filtered console methods
// eslint-disable-next-line no-console
console.log = createFilteredConsole('log', suppressedPatterns)
// eslint-disable-next-line no-console
console.warn = createFilteredConsole('warn', [...suppressedPatterns, ...expectedReactWarnings])
// eslint-disable-next-line no-console
console.error = createFilteredConsole('error', [...suppressedPatterns, ...expectedReactWarnings])

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
jest.mock('react-native-keyboard-controller', () => {
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

jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual('react-native')

  return {
    WebView: jest.fn((props) => {
      return globalThis.React.createElement(View, { testID: 'mocked-webview', ...props })
    }),
  }
})

// Mock react-native-logs to silence console output from loggers
jest.mock('react-native-logs', () => {
  const createSilentLogger = () => ({
    test: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  })

  return {
    logger: {
      createLogger: jest.fn(() => createSilentLogger()),
    },
    consoleTransport: jest.fn(),
  }
})

// Mock @bifold/remote-logs for a silent RemoteLogger
jest.mock('@bifold/remote-logs', () => {
  class MockRemoteLogger {
    remoteLoggingEnabled = false
    sessionId = undefined

    test = jest.fn()
    trace = jest.fn()
    debug = jest.fn()
    info = jest.fn()
    warn = jest.fn()
    error = jest.fn()
    fatal = jest.fn()
    report = jest.fn()

    startEventListeners = jest.fn()
    stopEventListeners = jest.fn()
    overrideCurrentAutoDisableExpiration = jest.fn()
  }

  return {
    RemoteLogger: MockRemoteLogger,
    RemoteLoggerEventTypes: {
      ENABLE_REMOTE_LOGGING: 'RemoteLogging.Enable',
    },
    consoleTransport: jest.fn(),
    lokiTransport: jest.fn(),
  }
})
