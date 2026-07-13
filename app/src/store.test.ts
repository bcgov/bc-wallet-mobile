import { BCDispatchAction, initialState, reducer } from './store'

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

describe('reducer', () => {
  it('UPDATE_APP_VERSION sets appVersion and appBuildNumber', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, appVersion: '', appBuildNumber: '' } }
    const result = reducer(state, { type: BCDispatchAction.UPDATE_APP_VERSION })

    expect(result.bcsc.appVersion).toBe('4.0.0')
    expect(result.bcsc.appBuildNumber).toBe('100')
  })
})
