import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BCState } from '@/store'
import { BannerDismissal } from './banner-dismissal'
import { selectBannerDismissal } from './selectors'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const buildState = (dismissedBanners?: Record<string, { dismissedAt: number }>) =>
  ({ bcsc: { dismissedBanners } }) as unknown as BCState

// APP_UPDATE_AVAILABLE is dismissed for one day; every other banner has no configured duration
describe('selectBannerDismissal', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns NotDismissed when no dismissals are stored', () => {
    expect(selectBannerDismissal(buildState(), BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed when only a different banner was dismissed', () => {
    const state = buildState({ [BCSCBanner.IAS_SERVER_NOTIFICATION]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns NotDismissed for a banner that cannot be dismissed, even when a dismissal is stored', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const state = buildState({ [BCSCBanner.DEVICE_LIMIT_EXCEEDED]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, BCSCBanner.DEVICE_LIMIT_EXCEEDED)).toBe(BannerDismissal.NotDismissed)
  })

  it('returns DismissalEnded when the stored dismissal time is not a number', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const state = buildState({ [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: NaN } })

    expect(selectBannerDismissal(state, BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.DismissalEnded)
  })

  it('returns Dismissed while the dismissal duration is still running', () => {
    jest.spyOn(Date, 'now').mockReturnValue(500 + ONE_DAY_MS - 1)
    const state = buildState({ [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.Dismissed)
  })

  it('returns DismissalEnded once the dismissal duration has ended', () => {
    jest.spyOn(Date, 'now').mockReturnValue(500 + ONE_DAY_MS)
    const state = buildState({ [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 500 } })

    expect(selectBannerDismissal(state, BCSCBanner.APP_UPDATE_AVAILABLE)).toBe(BannerDismissal.DismissalEnded)
  })
})
