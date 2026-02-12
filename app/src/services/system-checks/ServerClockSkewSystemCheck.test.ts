import { AppEventCode } from '@/events/appEventCode'
import { MockLogger } from '@bifold/core'
import { TFunction } from 'i18next'
import * as LinkingModule from 'react-native'
import { ServerClockSkewSystemCheck } from './ServerClockSkewSystemCheck'

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000

describe('ServerClockSkewSystemCheck', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00Z'))
    jest.resetModules()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('runCheck', () => {
    it('should fail when device clock skewed 5 minutes or more from server clock', async () => {
      const mockEmitAlert = jest.fn()

      const mockUtils = {
        logger: new MockLogger(),
        dispatch: jest.fn(),
        translation: jest.fn() as unknown as TFunction,
      }

      const serverTimestamp = new Date()
      const deviceTimestamp = new Date(serverTimestamp.getTime() - FIVE_MINUTES_IN_MS)

      const systemCheck = new ServerClockSkewSystemCheck(serverTimestamp, deviceTimestamp, mockEmitAlert, mockUtils)

      expect(systemCheck.runCheck()).toBe(false)
    })

    it('should fail when device clock skewed 5 minutes or more less than server clock', async () => {
      const mockEmitAlert = jest.fn()

      const mockUtils = {
        logger: new MockLogger(),
        dispatch: jest.fn(),
        translation: jest.fn() as unknown as TFunction,
      }

      const serverTimestamp = new Date()
      const deviceTimestamp = new Date(serverTimestamp.getTime() + FIVE_MINUTES_IN_MS)

      const systemCheck = new ServerClockSkewSystemCheck(serverTimestamp, deviceTimestamp, mockEmitAlert, mockUtils)

      expect(systemCheck.runCheck()).toBe(false)
    })

    it('should pass when device clock is the same as server clock', async () => {
      const mockEmitAlert = jest.fn()

      const mockUtils = {
        logger: new MockLogger(),
        dispatch: jest.fn(),
        translation: jest.fn() as unknown as TFunction,
      }

      const serverTimestamp = new Date()
      const deviceTimestamp = new Date(serverTimestamp.getTime())

      const systemCheck = new ServerClockSkewSystemCheck(serverTimestamp, deviceTimestamp, mockEmitAlert, mockUtils)

      expect(systemCheck.runCheck()).toBe(true)
    })

    it('should pass when device clock skewed less than 5 minutes from server clock', async () => {
      const mockEmitAlert = jest.fn()

      const mockUtils = {
        logger: new MockLogger(),
        dispatch: jest.fn(),
        translation: jest.fn() as unknown as TFunction,
      }

      const serverTimestamp = new Date()
      const deviceTimestamp = new Date(serverTimestamp.getTime() - FIVE_MINUTES_IN_MS + 1) // 1 ms within the threshold

      const systemCheck = new ServerClockSkewSystemCheck(serverTimestamp, deviceTimestamp, mockEmitAlert, mockUtils)

      expect(systemCheck.runCheck()).toBe(true)
    })
  })

  describe('onFail', () => {
    it('should emit an alert when the check fails', () => {
      const mockEmitAlert = jest.fn()

      const mockUtils = {
        logger: new MockLogger(),
        dispatch: jest.fn(),
        translation: ((key: string) => key) as unknown as TFunction,
      }

      const serverTimestamp = new Date()
      const deviceTimestamp = new Date(serverTimestamp.getTime() - FIVE_MINUTES_IN_MS)

      const systemCheck = new ServerClockSkewSystemCheck(serverTimestamp, deviceTimestamp, mockEmitAlert, mockUtils)

      systemCheck.onFail()

      expect(mockEmitAlert).toHaveBeenCalledWith('Alerts.ClockSkewError.Title', 'Alerts.ClockSkewError.Description', {
        event: AppEventCode.CLOCK_SKEW_ERROR,
        actions: [
          {
            text: 'Global.Close',
          },
          {
            text: 'Alerts.ClockSkewError.Action1',
            onPress: expect.any(Function),
          },
        ],
      })
    })

    it('onPress of Action1 should open device settings', () => {
      const mockEmitAlert = jest.fn()

      const mockUtils = {
        logger: new MockLogger(),
        dispatch: jest.fn(),
        translation: ((key: string) => key) as unknown as TFunction,
      }

      const serverTimestamp = new Date()
      const deviceTimestamp = new Date(serverTimestamp.getTime() - FIVE_MINUTES_IN_MS)

      const openSettingsSpy = jest.spyOn(LinkingModule.Linking, 'openSettings')

      const systemCheck = new ServerClockSkewSystemCheck(serverTimestamp, deviceTimestamp, mockEmitAlert, mockUtils)

      systemCheck.onFail()

      // Extract the onPress function from the emitted alert
      const onPressAction1 = mockEmitAlert.mock.calls[0][2].actions[1].onPress

      // Simulate pressing the Action1 button
      onPressAction1()

      expect(openSettingsSpy).toHaveBeenCalled()
    })
  })
})
