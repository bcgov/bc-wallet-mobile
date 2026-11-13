import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { AppState } from 'react-native'
import { RateLimitedAction, RateLimitWaitType } from './rate-limit'
import { useRateLimitWait } from './useRateLimitWait'

const START = new Date('2026-01-01T00:00:00.000Z')
const minutesFromStart = (minutes: number) => new Date(START.getTime() + minutes * 60_000).toISOString()

describe('useRateLimitWait (connected)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(START)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  const setup = () => {
    const wrapper = ({ children }: React.PropsWithChildren) => <BasicAppContext>{children}</BasicAppContext>
    const hook = renderHook(
      () => {
        const [, dispatch] = useStore<BCState>()
        return { wait: useRateLimitWait(RateLimitedAction.CardAdd), dispatch }
      },
      { wrapper }
    )
    const record = (retryAt: string) =>
      act(() => {
        hook.result.current.dispatch({
          type: BCDispatchAction.RATE_LIMIT_RECEIVED,
          payload: [{ action: RateLimitedAction.CardAdd, retryAt }],
        })
      })
    return { hook, record }
  }

  it('counts down the minutes, then ends the wait at the retry time', () => {
    const { hook, record } = setup()
    expect(hook.result.current.wait).toEqual({ type: RateLimitWaitType.None })

    record(minutesFromStart(3))
    expect(hook.result.current.wait).toMatchObject({ type: RateLimitWaitType.Waiting, minutes: 3 })

    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    expect(hook.result.current.wait).toMatchObject({ type: RateLimitWaitType.Waiting, minutes: 2 })

    // Each tick reschedules from an effect, so advance one interval per act
    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    expect(hook.result.current.wait).toEqual({ type: RateLimitWaitType.None })
  })

  it('ends a short wait at the retry time rather than the next minute tick', () => {
    const { hook, record } = setup()
    record(new Date(START.getTime() + 20_000).toISOString())

    act(() => {
      jest.advanceTimersByTime(20_000)
    })

    expect(hook.result.current.wait).toEqual({ type: RateLimitWaitType.None })
  })

  it('computes a wait recorded after the clock moved on from the fresh clock, not the stale one', () => {
    const { hook, record } = setup()
    expect(hook.result.current.wait).toEqual({ type: RateLimitWaitType.None })

    // The hook last read the clock at mount; move it without running timers
    jest.setSystemTime(new Date(START.getTime() + 30 * 60_000))
    record(new Date(START.getTime() + 33 * 60_000).toISOString())

    expect(hook.result.current.wait).toMatchObject({ type: RateLimitWaitType.Waiting, minutes: 3 })
  })

  it('ends a short wait recorded on a stale clock at its retry time, not the next minute tick', () => {
    const { hook, record } = setup()

    jest.setSystemTime(new Date(START.getTime() + 30 * 60_000))
    record(new Date(START.getTime() + 30 * 60_000 + 20_000).toISOString())
    expect(hook.result.current.wait).toMatchObject({ type: RateLimitWaitType.Waiting })

    act(() => {
      jest.advanceTimersByTime(20_000)
    })

    expect(hook.result.current.wait).toEqual({ type: RateLimitWaitType.None })
  })

  it('re-derives on app foreground after the time has passed', () => {
    let onChange: (state: string) => void = () => {}
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      onChange = listener as (state: string) => void
      return { remove: jest.fn() }
    })
    const { hook, record } = setup()
    record(minutesFromStart(5))
    expect(hook.result.current.wait).toMatchObject({ type: RateLimitWaitType.Waiting })

    // A backgrounded app gets no timers, so move the clock without running them
    jest.setSystemTime(new Date(START.getTime() + 6 * 60_000))
    act(() => onChange('active'))

    expect(hook.result.current.wait).toEqual({ type: RateLimitWaitType.None })
  })

  it('replaces an active deadline with a later one', () => {
    const { hook, record } = setup()
    record(minutesFromStart(2))
    act(() => {
      jest.advanceTimersByTime(60_000)
    })

    record(minutesFromStart(10))
    expect(hook.result.current.wait).toMatchObject({ type: RateLimitWaitType.Waiting, minutes: 9 })

    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    expect(hook.result.current.wait).toMatchObject({ type: RateLimitWaitType.Waiting, minutes: 8 })
  })
})
