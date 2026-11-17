import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BCState } from '@/store'
import { BANNER_DISMISS_DURATION_MS, BannerDismissal } from './banner-dismissal'
import { selectBannerDismissal } from './selectors'

// A banner that only exists for these tests, so changing a real banner's duration cannot break them
const TEST_BANNER = 'TestBanner' as BCSCBanner
const OTHER_BANNER = 'OtherTestBanner' as BCSCBanner
const DURATION_MS = 10_000

const setDuration = (duration: number) => {
  BANNER_DISMISS_DURATION_MS[TEST_BANNER] = duration
}

const buildState = (dismissedBanners?: Record<string, { dismissedAt: number }>) =>
  ({ bcsc: { dismissedBanners } }) as unknown as BCState

describe('selectBannerDismissal', () => {
  afterEach(() => {
    Reflect.deleteProperty(BANNER_DISMISS_DURATION_MS, TEST_BANNER)
    jest.restoreAllMocks()
  })

  it('returns NotDismissed when no dismissals are stored', () => {
    setDuration(DURATION_MS)

    expect(selectBannerDismissal(buildState(), TEST_BANNER)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed when only a different banner was dismissed', () => {
    setDuration(DURATION_MS)
    const state = buildState({ [OTHER_BANNER]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, TEST_BANNER)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed for a banner that cannot be dismissed, even when a dismissal is stored', () => {
    setDuration(0)
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const state = buildState({ [TEST_BANNER]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, TEST_BANNER)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns DismissalEnded when the stored dismissal time is not a number', () => {
    setDuration(DURATION_MS)
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const state = buildState({ [TEST_BANNER]: { dismissedAt: NaN } })

    expect(selectBannerDismissal(state, TEST_BANNER)).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns Dismissed while the dismissal duration is still running', () => {
    setDuration(DURATION_MS)
    jest.spyOn(Date, 'now').mockReturnValue(500 + DURATION_MS - 1)
    const state = buildState({ [TEST_BANNER]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, TEST_BANNER)).toBe(BannerDismissal.Dismissed)
  })

  it('returns DismissalEnded once the dismissal duration has ended', () => {
    setDuration(DURATION_MS)
    jest.spyOn(Date, 'now').mockReturnValue(500 + DURATION_MS)
    const state = buildState({ [TEST_BANNER]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, TEST_BANNER)).toBe(BannerDismissal.DismissalEnded)
  })
})
