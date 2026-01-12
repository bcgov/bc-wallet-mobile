import { RemoteLogger } from '@bifold/remote-logs'
import { LogLevel } from '@credo-ts/core'
import Config from 'react-native-config'

import { autoDisableRemoteLoggingIntervalInMinutes } from '../constants'
import { appLogger, createAppLogger } from './logger'

type ConfigModule = {
  REMOTE_LOGGING_URL: string
  LOG_LEVEL?: string
}

jest.mock('react-native-device-info', () => ({
  getApplicationName: jest.fn(() => 'TestApp'),
  getVersion: jest.fn(() => '1.2.3'),
  getBuildNumber: jest.fn(() => '77'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '17.0'),
}))

jest.mock('react-native-config', () => ({
  REMOTE_LOGGING_URL: 'https://logs.example',
  LOG_LEVEL: 'warn',
}))

jest.mock('@bifold/remote-logs', () => {
  return {
    RemoteLogger: jest.fn().mockImplementation((options) => ({ options })),
  }
})

const mockedConfig = Config as ConfigModule
const RemoteLoggerMock = RemoteLogger as unknown as jest.Mock

describe('createAppLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedConfig.LOG_LEVEL = 'warn'
  })

  it('exports a singleton logger using env log level', () => {
    expect(appLogger).toBeDefined()
    expect((appLogger as unknown as { options: { logLevel: LogLevel } }).options.logLevel).toBe(LogLevel.warn)
  })

  it('merges base labels, extra labels, and env-derived log level', () => {
    mockedConfig.LOG_LEVEL = 'info'
    RemoteLoggerMock.mockClear()
    createAppLogger({ subsystem: 'demo' })

    expect(RemoteLoggerMock).toHaveBeenCalledTimes(1)
    expect(RemoteLoggerMock).toHaveBeenCalledWith({
      lokiUrl: 'https://logs.example',
      lokiLabels: {
        application: 'testapp',
        version: '1.2.3-77',
        system: 'iOS v17.0',
        subsystem: 'demo',
      },
      autoDisableRemoteLoggingIntervalInMinutes,
      logLevel: LogLevel.info,
    })
  })

  it('falls back to debug when env log level is missing or invalid', () => {
    delete mockedConfig.LOG_LEVEL
    RemoteLoggerMock.mockClear()
    createAppLogger()

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: LogLevel.debug }))
  })

  it('prefers explicit log level parameter over env config', () => {
    mockedConfig.LOG_LEVEL = 'fatal'
    RemoteLoggerMock.mockClear()
    createAppLogger({}, LogLevel.error)

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: LogLevel.error }))
  })

  it('allows extra labels to override defaults', () => {
    RemoteLoggerMock.mockClear()

    createAppLogger({ application: 'custom-app' })

    expect(RemoteLoggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lokiLabels: expect.objectContaining({ application: 'custom-app' }),
      })
    )
  })

  it.each([
    ['fatal', LogLevel.fatal],
    ['error', LogLevel.error],
    ['warning', LogLevel.warn],
    ['trace', LogLevel.debug],
    ['test', LogLevel.debug],
    ['unknown', LogLevel.debug],
  ])('maps env value %s to correct log level', (envValue, expectedLevel) => {
    mockedConfig.LOG_LEVEL = envValue
    RemoteLoggerMock.mockClear()

    createAppLogger()

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: expectedLevel }))
  })
})
