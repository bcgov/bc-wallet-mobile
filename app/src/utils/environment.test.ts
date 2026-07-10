import Config from 'react-native-config'
import { getInitialEnvironment, IASEnvironment } from './environment'

jest.mock('react-native-config', () => ({
  BUILD_TARGET: 'bcsc',
  DEFAULT_ENVIRONMENT: '',
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

describe('IASEnvironment', () => {
  it('computes analyticsAppId from the analytics prefix and subdomain', () => {
    expect(IASEnvironment.PROD.analyticsAppId).toBe('Snowplow_standalone_IDIMapp_prod')
    expect(IASEnvironment.SIT.analyticsAppId).toBe('Snowplow_standalone_IDIMapp_sit')
  })

  it('builds the IAS API base URL from the subdomain (prod has no subdomain)', () => {
    expect(IASEnvironment.SIT.iasApiBaseUrl).toBe('https://idsit.gov.bc.ca')
    expect(IASEnvironment.PROD.iasApiBaseUrl).toBe('https://id.gov.bc.ca')
  })
})
