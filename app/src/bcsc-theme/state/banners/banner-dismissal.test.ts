import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BANNER_DISMISS_DURATION_MS, BannerDismissal, getBannerDismissal } from './banner-dismissal'

// A banner that only exists for these tests, so changing a real banner's duration cannot break them
const TEST_BANNER = 'TestBanner' as BCSCBanner
const DURATION_MS = 10_000

const setDuration = (duration: number) => {
  BANNER_DISMISS_DURATION_MS[TEST_BANNER] = duration
}

describe('getBannerDismissal', () => {
  const facts = { now: 1000, bannerId: TEST_BANNER, dismissedAt: 500 }

  afterEach(() => {
    Reflect.deleteProperty(BANNER_DISMISS_DURATION_MS, TEST_BANNER)
  })

  it('returns NotDismissed when no dismissal is recorded', () => {
    setDuration(DURATION_MS)

    expect(getBannerDismissal({ ...facts, dismissedAt: null })).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed when no dismissal is recorded, even for a banner that cannot be dismissed', () => {
    setDuration(0)

    expect(getBannerDismissal({ ...facts, dismissedAt: null })).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed for a banner that cannot be dismissed, even when a dismissal is recorded', () => {
    setDuration(0)

    expect(getBannerDismissal(facts)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed for a banner with no configured duration, even when a dismissal is recorded', () => {
    expect(getBannerDismissal(facts)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns DismissalEnded when the dismissal was recorded in the future', () => {
    setDuration(DURATION_MS)

    expect(getBannerDismissal({ ...facts, now: 400 })).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns DismissalEnded when the dismissal time is not a finite number', () => {
    setDuration(DURATION_MS)

    expect(getBannerDismissal({ ...facts, dismissedAt: NaN })).toBe(BannerDismissal.DismissalEnded)
    expect(getBannerDismissal({ ...facts, dismissedAt: Infinity })).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns Dismissed while the dismissal duration is still running', () => {
    setDuration(DURATION_MS)

    expect(getBannerDismissal(facts)).toBe(BannerDismissal.Dismissed)
  })

  it('returns Dismissed one millisecond before the duration ends', () => {
    setDuration(DURATION_MS)

    expect(getBannerDismissal({ ...facts, now: 500 + DURATION_MS - 1 })).toBe(BannerDismissal.Dismissed)
  })

  it('returns DismissalEnded exactly when the duration ends', () => {
    setDuration(DURATION_MS)

    expect(getBannerDismissal({ ...facts, now: 500 + DURATION_MS })).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns DismissalEnded after the duration has ended', () => {
    setDuration(DURATION_MS)

    expect(getBannerDismissal({ ...facts, now: 500 + DURATION_MS * 2 })).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns Dismissed for as long as asked when the duration is Infinity', () => {
    setDuration(Infinity)

    expect(getBannerDismissal({ ...facts, now: Number.MAX_SAFE_INTEGER })).toBe(BannerDismissal.Dismissed)
  })
})
