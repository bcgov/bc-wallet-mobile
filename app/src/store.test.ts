import Config from 'react-native-config'
import { getInitialEnvironment, IASEnvironment } from './store'

jest.mock('react-native-config', () => ({
  BUILD_TARGET: 'bcsc',
  DEFAULT_ENVIRONMENT: '',
}))

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '4.0.0'),
}))

jest.mock('react-native-bcsc-core', () => ({}))
jest.mock('@bifold/core', () => ({
  defaultState: { preferences: {}, tours: {}, onboarding: {}, loginAttempt: {}, migration: {} },
  mergeReducers: jest.fn(),
  reducer: jest.fn(),
}))

const configMock = Config as { DEFAULT_ENVIRONMENT: string; BUILD_TARGET: string }

describe('getInitialEnvironment', () => {
  afterEach(() => {
    configMock.DEFAULT_ENVIRONMENT = ''
    configMock.BUILD_TARGET = 'bcsc'
  })

  it('returns SIT when DEFAULT_ENVIRONMENT is SIT', () => {
    configMock.DEFAULT_ENVIRONMENT = 'SIT'
    expect(getInitialEnvironment()).toBe(IASEnvironment.SIT)
  })

  it('returns PROD when DEFAULT_ENVIRONMENT is PROD', () => {
    configMock.DEFAULT_ENVIRONMENT = 'PROD'
    expect(getInitialEnvironment()).toBe(IASEnvironment.PROD)
  })

  it('returns QA when DEFAULT_ENVIRONMENT is QA', () => {
    configMock.DEFAULT_ENVIRONMENT = 'QA'
    expect(getInitialEnvironment()).toBe(IASEnvironment.QA)
  })

  it('returns TEST when DEFAULT_ENVIRONMENT is TEST', () => {
    configMock.DEFAULT_ENVIRONMENT = 'TEST'
    expect(getInitialEnvironment()).toBe(IASEnvironment.TEST)
  })

  it('is case-insensitive', () => {
    configMock.DEFAULT_ENVIRONMENT = 'sit'
    expect(getInitialEnvironment()).toBe(IASEnvironment.SIT)
  })

  it('falls back to SIT for __DEV__ BCSC builds when DEFAULT_ENVIRONMENT is empty', () => {
    configMock.DEFAULT_ENVIRONMENT = ''
    configMock.BUILD_TARGET = 'bcsc'
    // __DEV__ is true in test environment
    expect(getInitialEnvironment()).toBe(IASEnvironment.SIT)
  })

  it('falls back to PROD when DEFAULT_ENVIRONMENT is empty and not a __DEV__ BCSC build', () => {
    configMock.DEFAULT_ENVIRONMENT = ''
    configMock.BUILD_TARGET = 'bcwallet'
    expect(getInitialEnvironment()).toBe(IASEnvironment.PROD)
  })

  it('falls back when DEFAULT_ENVIRONMENT is an invalid value', () => {
    configMock.DEFAULT_ENVIRONMENT = 'INVALID'
    configMock.BUILD_TARGET = 'bcwallet'
    expect(getInitialEnvironment()).toBe(IASEnvironment.PROD)
  })
})
