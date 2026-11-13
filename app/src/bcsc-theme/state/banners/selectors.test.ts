import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BCState } from '@/store'
import { BannerDismissal } from './banner-dismissal'
import { selectBannerDismissal } from './selectors'

const buildState = (dismissedBanners?: Record<string, { dismissedAt: number; dismissedUntil?: number }>) =>
  ({ bcsc: { dismissedBanners } }) as unknown as BCState

describe('selectBannerDismissal', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns NotDismissed when no dismissals are stored', () => {
    expect(selectBannerDismissal(buildState(), BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed when only a different banner was dismissed', () => {
    const state = buildState({ [BCSCBanner.IAS_SERVER_NOTIFICATION]: { dismissedAt: 500, dismissedUntil: 2000 } })

    expect(selectBannerDismissal(state, BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns Dismissed when the dismissal has no end', () => {
    const state = buildState({ [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.Dismissed)
  })

  it('returns Dismissed while dismissedUntil has not been reached', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const state = buildState({ [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 500, dismissedUntil: 2000 } })

    expect(selectBannerDismissal(state, BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.Dismissed)
  })

  it('returns DismissalEnded once dismissedUntil has been reached', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2000)
    const state = buildState({ [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 500, dismissedUntil: 2000 } })

    expect(selectBannerDismissal(state, BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.DismissalEnded)
  })
})
