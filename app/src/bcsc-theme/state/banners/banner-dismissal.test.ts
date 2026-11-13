import { BannerDismissal, getBannerDismissal } from './banner-dismissal'

describe('getBannerDismissal', () => {
  const facts = { now: 1000, dismissedAt: 500, dismissedUntil: 2000 }

  it('returns NotDismissed when no dismissal is recorded', () => {
    expect(getBannerDismissal({ ...facts, dismissedAt: null })).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed when there is no dismissal, even if dismissedUntil is set', () => {
    expect(getBannerDismissal({ ...facts, dismissedAt: null, dismissedUntil: 100 })).toBe(BannerDismissal.NotDismissed)
  })

  it('returns Dismissed when the dismissal has no end', () => {
    expect(getBannerDismissal({ ...facts, dismissedUntil: null })).toBe(BannerDismissal.Dismissed)
  })

  it('returns Dismissed while dismissedUntil has not been reached', () => {
    expect(getBannerDismissal(facts)).toBe(BannerDismissal.Dismissed)
  })

  it('returns Dismissed one millisecond before dismissedUntil', () => {
    expect(getBannerDismissal({ ...facts, now: 1999 })).toBe(BannerDismissal.Dismissed)
  })

  it('returns DismissalEnded exactly at dismissedUntil', () => {
    expect(getBannerDismissal({ ...facts, now: 2000 })).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns DismissalEnded after dismissedUntil', () => {
    expect(getBannerDismissal({ ...facts, now: 5000 })).toBe(BannerDismissal.DismissalEnded)
  })
})
