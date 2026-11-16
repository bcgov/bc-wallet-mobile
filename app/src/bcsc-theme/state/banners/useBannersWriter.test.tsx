import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { useBannersWriter } from './useBannersWriter'

// Real store and reducer, so the tests check what ends up in state rather than the dispatched action
const renderWriter = () =>
  renderHook(
    () => {
      const [store] = useStore<BCState>()
      return { writer: useBannersWriter(), dismissedBanners: store.bcsc.dismissedBanners }
    },
    { wrapper: ({ children }: React.PropsWithChildren) => <BasicAppContext>{children}</BasicAppContext> }
  )

describe('useBannersWriter', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('starts with no dismissals', () => {
    const { result } = renderWriter()

    expect(result.current.dismissedBanners ?? {}).toEqual({})
  })

  it('records when a banner was dismissed', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const { result } = renderWriter()

    act(() => {
      result.current.writer.recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
    })

    expect(result.current.dismissedBanners).toEqual({
      [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 1000 },
    })
  })

  it('keeps the dismissals of other banners', () => {
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1000)
    const { result } = renderWriter()

    act(() => {
      result.current.writer.recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
    })
    dateSpy.mockReturnValue(2000)
    act(() => {
      result.current.writer.recordBannerDismissal(BCSCBanner.IAS_SERVER_NOTIFICATION)
    })

    expect(result.current.dismissedBanners).toEqual({
      [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 1000 },
      [BCSCBanner.IAS_SERVER_NOTIFICATION]: { dismissedAt: 2000 },
    })
  })

  it('moves the dismissal time forward when the same banner is dismissed again', () => {
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1000)
    const { result } = renderWriter()

    act(() => {
      result.current.writer.recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
    })
    dateSpy.mockReturnValue(5000)
    act(() => {
      result.current.writer.recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
    })

    expect(result.current.dismissedBanners).toEqual({
      [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 5000 },
    })
  })

  it('keeps the same writer functions between renders', () => {
    const { result, rerender } = renderWriter()
    const first = result.current.writer

    rerender({})

    expect(result.current.writer).toBe(first)
  })
})
