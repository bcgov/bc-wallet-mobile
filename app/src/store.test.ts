import Config from 'react-native-config'
import { BCDispatchAction, getInitialEnvironment, IASEnvironment, initialState, reducer } from './store'

jest.mock('react-native-config', () => ({
  BUILD_TARGET: 'bcsc',
  DEFAULT_ENVIRONMENT: '',
}))

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '4.0.0'),
  getBuildNumber: jest.fn(() => '100'),
}))

jest.mock('react-native-bcsc-core', () => ({}))
jest.mock('@bifold/core', () => ({
  defaultState: { preferences: {}, tours: {}, onboarding: {}, loginAttempt: {}, migration: {} },
  mergeReducers: jest.fn((_base: any, custom: any) => custom),
  reducer: jest.fn(),
  PersistentStorage: { storeValueForKey: jest.fn() },
}))

const configMock = Config as { DEFAULT_ENVIRONMENT: string; BUILD_TARGET: string }
const originalDev = __DEV__

describe('getInitialEnvironment', () => {
  afterEach(() => {
    configMock.DEFAULT_ENVIRONMENT = ''
    configMock.BUILD_TARGET = 'bcsc'
    // @ts-expect-error - set global DEV
    global.__DEV__ = originalDev
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
    // @ts-expect-error - set global DEV
    global.__DEV__ = true
    configMock.DEFAULT_ENVIRONMENT = ''
    configMock.BUILD_TARGET = 'bcsc'
    expect(getInitialEnvironment()).toBe(IASEnvironment.SIT)
  })

  it('falls back to PROD when DEFAULT_ENVIRONMENT is empty and not a __DEV__ BCSC build', () => {
    // @ts-expect-error - set global DEV
    global.__DEV__ = true
    configMock.DEFAULT_ENVIRONMENT = ''
    configMock.BUILD_TARGET = 'bcwallet'
    expect(getInitialEnvironment()).toBe(IASEnvironment.PROD)
  })

  it('falls back to PROD when __DEV__ is false and DEFAULT_ENVIRONMENT is empty', () => {
    // @ts-expect-error - set global DEV
    global.__DEV__ = false
    configMock.DEFAULT_ENVIRONMENT = ''
    configMock.BUILD_TARGET = 'bcsc'
    expect(getInitialEnvironment()).toBe(IASEnvironment.PROD)
  })

  it('falls back when DEFAULT_ENVIRONMENT is an invalid value', () => {
    // @ts-expect-error - set global DEV
    global.__DEV__ = true
    configMock.DEFAULT_ENVIRONMENT = 'INVALID'
    configMock.BUILD_TARGET = 'bcwallet'
    expect(getInitialEnvironment()).toBe(IASEnvironment.PROD)
  })
})

describe('reducer', () => {
  it('UPDATE_APP_VERSION sets appVersion and appBuildNumber', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, appVersion: '', appBuildNumber: '' } }
    const result = reducer(state, { type: BCDispatchAction.UPDATE_APP_VERSION })

    expect(result.bcsc.appVersion).toBe('4.0.0')
    expect(result.bcsc.appBuildNumber).toBe('100')
  })
})
