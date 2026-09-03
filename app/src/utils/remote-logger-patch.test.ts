// Exercises the real @bifold/remote-logs build patched by
// .yarn/patches/@bifold-remote-logs-npm-3.0.21-4ae200989a.patch (#4599); jestSetup.js
// mocks the package globally, so the unmocks below (hoisted by babel-jest) are required.
// Delete this file when the patch is dropped.
import { RemoteLogger } from '@bifold/remote-logs'
import { LogLevel } from '@credo-ts/core'

jest.unmock('@bifold/remote-logs')
jest.unmock('react-native-logs')

// AbstractBifoldLogger._config.async is true: transports run via setTimeout(0).
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('RemoteLogger trace/test level patch', () => {
  it('hides trace and test messages at the default development level (debug)', () => {
    const traceSpy = jest.spyOn(console, 'trace').mockImplementation(() => {})
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})
    // 'test' level falls through to the transport's default console.log branch,
    // so this is the assertion that actually proves it's gated out.
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const logger = new RemoteLogger({ logLevel: LogLevel.debug })

    logger.trace('ledger lookup')
    logger.test('some test message')
    logger.debug('a real debug message')
    jest.runOnlyPendingTimers()

    expect(traceSpy).not.toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalled()
    expect(debugSpy).toHaveBeenCalledTimes(1)
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('a real debug message'))
  })

  it('prints trace via console.debug (no stack) with a [TRACE] prefix once enabled', () => {
    const traceSpy = jest.spyOn(console, 'trace').mockImplementation(() => {})
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})

    const logger = new RemoteLogger({ logLevel: LogLevel.trace })

    logger.trace('ledger lookup')
    jest.runOnlyPendingTimers()

    expect(traceSpy).not.toHaveBeenCalled()
    expect(debugSpy).toHaveBeenCalledTimes(1)
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[TRACE]'))
  })

  it('forces the lowest level (test) when remote logging is enabled, and trace reaches the console', () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})

    const logger = new RemoteLogger({ logLevel: LogLevel.warn })

    expect(logger.logLevel).toBe(LogLevel.warn)

    logger.remoteLoggingEnabled = true
    expect(logger.logLevel).toBe(LogLevel.test)

    logger.trace('ledger lookup')
    jest.runOnlyPendingTimers()
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[TRACE]'))

    logger.remoteLoggingEnabled = false
    expect(logger.logLevel).toBe(LogLevel.warn)

    logger.dispose()
  })

  it('leaves error reporting unchanged', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const logger = new RemoteLogger({ logLevel: LogLevel.warn })

    logger.error('something broke', new Error('boom'))
    jest.runOnlyPendingTimers()

    expect(errorSpy).toHaveBeenCalledTimes(1)
  })
})
