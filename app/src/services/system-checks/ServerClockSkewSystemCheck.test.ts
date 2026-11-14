import { MockLogger } from '@bifold/core'
import { TFunction } from 'i18next'
import { ClockReading, ServerClockSkewSystemCheck } from './ServerClockSkewSystemCheck'

const createUtils = () => ({
  logger: new MockLogger(),
  dispatch: jest.fn(),
  translation: jest.fn() as unknown as TFunction,
})

describe('ServerClockSkewSystemCheck', () => {
  describe('runCheck', () => {
    it('fails when the client reads the device clock as skewed', () => {
      const clock: ClockReading = { isClockSkewed: true, clockSkewSeconds: -3600 }

      const systemCheck = new ServerClockSkewSystemCheck(clock, jest.fn(), createUtils())

      expect(systemCheck.runCheck()).toBe(false)
    })

    it('passes when the device clock is within the allowed skew', () => {
      const clock: ClockReading = { isClockSkewed: false, clockSkewSeconds: 120 }

      const systemCheck = new ServerClockSkewSystemCheck(clock, jest.fn(), createUtils())

      expect(systemCheck.runCheck()).toBe(true)
    })

    it('passes when there is no reading, as nothing is known to be wrong', () => {
      const clock: ClockReading = { isClockSkewed: false, clockSkewSeconds: null }

      const systemCheck = new ServerClockSkewSystemCheck(clock, jest.fn(), createUtils())

      expect(systemCheck.runCheck()).toBe(true)
    })

    it('reads the clock when it runs, not when it is created', () => {
      const clock: ClockReading = { isClockSkewed: false, clockSkewSeconds: null }
      const systemCheck = new ServerClockSkewSystemCheck(clock, jest.fn(), createUtils())

      clock.isClockSkewed = true
      clock.clockSkewSeconds = 3600

      expect(systemCheck.runCheck()).toBe(false)
    })
  })

  describe('onFail', () => {
    it('shows the clock alert', () => {
      const showClockSkewAlert = jest.fn()
      const clock: ClockReading = { isClockSkewed: true, clockSkewSeconds: -3600 }

      new ServerClockSkewSystemCheck(clock, showClockSkewAlert, createUtils()).onFail()

      expect(showClockSkewAlert).toHaveBeenCalledTimes(1)
    })

    it.each([
      [-3600, 'ahead'],
      [600, 'behind'],
    ])('logs the skew of %ss as the device clock being %s', (clockSkewSeconds, deviceClock) => {
      const utils = createUtils()
      const warnSpy = jest.spyOn(utils.logger, 'warn')

      new ServerClockSkewSystemCheck({ isClockSkewed: true, clockSkewSeconds }, jest.fn(), utils).onFail()

      expect(warnSpy).toHaveBeenCalledWith('[ServerClockSkewSystemCheck] Server clock skew detected', {
        observedSkewSeconds: Math.abs(clockSkewSeconds),
        deviceClock,
        maxAllowedSkewSeconds: 300,
      })
    })
  })
})
