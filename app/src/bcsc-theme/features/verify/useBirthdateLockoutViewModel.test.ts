import { RateLimitedAction, RateLimitWait, RateLimitWaitType } from '@/bcsc-theme/state/rate-limit/rate-limit'
import { useRateLimitWait } from '@/bcsc-theme/state/rate-limit/useRateLimitWait'
import { renderHook } from '@testing-library/react-native'
import { useBirthdateLockoutViewModel } from './useBirthdateLockoutViewModel'

jest.mock('@/bcsc-theme/state/rate-limit/useRateLimitWait', () => ({ useRateLimitWait: jest.fn() }))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { minutes?: number }) => (options ? `${key}:${options.minutes}` : key),
  }),
}))

const none: RateLimitWait = { type: RateLimitWaitType.None }
const waiting = (minutes: number): RateLimitWait => ({ type: RateLimitWaitType.Waiting, retryAt: new Date(), minutes })

describe('useBirthdateLockoutViewModel', () => {
  const navigation = { goBack: jest.fn() }

  const render = (initial: RateLimitWait) => {
    jest.mocked(useRateLimitWait).mockReturnValue(initial)
    return renderHook(() => useBirthdateLockoutViewModel(navigation as never))
  }

  const setWait = (view: ReturnType<typeof render>, wait: RateLimitWait) => {
    jest.mocked(useRateLimitWait).mockReturnValue(wait)
    view.rerender({})
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reads the card add wait', () => {
    render(none)

    expect(useRateLimitWait).toHaveBeenCalledWith(RateLimitedAction.CardAdd)
  })

  it('shows the untimed message when no retry time is known', () => {
    expect(render(none).result.current.message).toBe('BCSC.BirthdateLockout.Message')
  })

  it('shows the minutes while waiting', () => {
    expect(render(waiting(7)).result.current.message).toBe('BCSC.BirthdateLockout.WaitMinutes:7')
  })

  it('shows the one-minute copy for a single minute', () => {
    expect(render(waiting(1)).result.current.message).toBe('BCSC.BirthdateLockout.WaitOneMinute')
  })

  it('says the wait is over only after a wait was seen on this screen', () => {
    const view = render(waiting(1))

    setWait(view, none)

    expect(view.result.current.message).toBe('BCSC.BirthdateLockout.WaitOver')
  })

  it('picks up a wait recorded after the screen opened, then ends it', () => {
    const view = render(none)
    expect(view.result.current.message).toBe('BCSC.BirthdateLockout.Message')

    setWait(view, waiting(10))
    expect(view.result.current.message).toBe('BCSC.BirthdateLockout.WaitMinutes:10')

    setWait(view, none)
    expect(view.result.current.message).toBe('BCSC.BirthdateLockout.WaitOver')
  })

  it('goes back on close', () => {
    render(none).result.current.handleClose()

    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })
})
