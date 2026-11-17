import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BannerDismissal, getBannerDismissal } from './banner-dismissal'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

describe('getBannerDismissal', () => {
  // APP_UPDATE_AVAILABLE is dismissed for one day; LIVE_CALL_STATUS cannot be dismissed (duration 0)
  const facts = { now: 1000, bannerId: BCSCBanner.APP_UPDATE_AVAILABLE, dismissedAt: 500 }

  it('returns NotDismissed when no dismissal is recorded', () => {
    expect(getBannerDismissal({ ...facts, dismissedAt: null })).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed when no dismissal is recorded, even for a banner that cannot be dismissed', () => {
    expect(getBannerDismissal({ ...facts, bannerId: BCSCBanner.LIVE_CALL_STATUS, dismissedAt: null })).toBe(
      BannerDismissal.NotDismissed
    )
  })

  it('returns NotDismissed for a banner that cannot be dismissed, even when a dismissal is recorded', () => {
    expect(getBannerDismissal({ ...facts, bannerId: BCSCBanner.LIVE_CALL_STATUS })).toBe(BannerDismissal.NotDismissed)
  })

  it('returns DismissalEnded when the dismissal was recorded in the future', () => {
    expect(getBannerDismissal({ ...facts, now: 400 })).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns DismissalEnded when the dismissal time is not a finite number', () => {
    expect(getBannerDismissal({ ...facts, dismissedAt: NaN })).toBe(BannerDismissal.DismissalEnded)
    expect(getBannerDismissal({ ...facts, dismissedAt: Infinity })).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns Dismissed while the dismissal duration is still running', () => {
    expect(getBannerDismissal(facts)).toBe(BannerDismissal.Dismissed)
  })

  it('returns Dismissed one millisecond before the duration ends', () => {
    expect(getBannerDismissal({ ...facts, now: 500 + ONE_DAY_MS - 1 })).toBe(BannerDismissal.Dismissed)
  })

  it('returns DismissalEnded exactly when the duration ends', () => {
    expect(getBannerDismissal({ ...facts, now: 500 + ONE_DAY_MS })).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns DismissalEnded after the duration has ended', () => {
    expect(getBannerDismissal({ ...facts, now: 500 + ONE_DAY_MS * 2 })).toBe(BannerDismissal.DismissalEnded)
  })
})
