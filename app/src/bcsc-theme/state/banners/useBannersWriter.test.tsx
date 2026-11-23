import { useBCSCStore } from '@/bcsc-theme/storage'
import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { useBannersWriter } from './useBannersWriter'

// Real store, so the tests check what ends up in state rather than the action called
const renderWriter = () =>
  renderHook(
    () => {
      const dismissedBanners = useBCSCStore((s) => s.app.dismissedBanners)
      return { writer: useBannersWriter(), dismissedBanners }
    },
    { wrapper: ({ children }: React.PropsWithChildren) => <BasicAppContext>{children}</BasicAppContext> }
  )

describe('useBannersWriter', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('starts with no dismissals', async () => {
    const { result } = renderWriter()

    expect(result.current.dismissedBanners ?? {}).toEqual({})
  })

  it('records when a banner was dismissed', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const { result } = renderWriter()

    await act(async () => {
      result.current.writer.recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
    })

    expect(result.current.dismissedBanners).toEqual({
      [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 1000 },
    })
  })

  it('keeps the dismissals of other banners', async () => {
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1000)
    const { result } = renderWriter()

    await act(async () => {
      result.current.writer.recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
    })
    dateSpy.mockReturnValue(2000)
    await act(async () => {
      result.current.writer.recordBannerDismissal(BCSCBanner.IAS_SERVER_NOTIFICATION)
    })

    expect(result.current.dismissedBanners).toEqual({
      [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 1000 },
      [BCSCBanner.IAS_SERVER_NOTIFICATION]: { dismissedAt: 2000 },
    })
  })

  it('moves the dismissal time forward when the same banner is dismissed again', async () => {
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1000)
    const { result } = renderWriter()

    await act(async () => {
      result.current.writer.recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
    })
    dateSpy.mockReturnValue(5000)
    await act(async () => {
      result.current.writer.recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
    })

    expect(result.current.dismissedBanners).toEqual({
      [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 5000 },
    })
  })

  it('keeps the same writer functions between renders', async () => {
    const { result, rerender } = renderWriter()
    const first = result.current.writer

    rerender({})

    expect(result.current.writer).toBe(first)
  })
})
