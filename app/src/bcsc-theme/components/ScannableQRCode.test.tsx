import { useInvertColorsEnabled } from '@/bcsc-theme/hooks/useInvertColorsEnabled'
import { TestIds } from '@/test-ids/registry'
import * as Bifold from '@bifold/core'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { Platform } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import ScannableQRCode from './ScannableQRCode'

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useServices: jest.fn(),
}))

jest.mock('@/bcsc-theme/hooks/useInvertColorsEnabled', () => ({
  useInvertColorsEnabled: jest.fn(),
}))

const value = 'https://example.com/static/selfsetup.html?token'
const black = '#000000'
const white = '#FFFFFF'
const cardTestId = testIdWithKey(TestIds.shared.scannableQRCode.card)

describe('ScannableQRCode', () => {
  const originalPlatform = Platform.OS
  const mockLogger = { error: jest.fn() }

  beforeEach(() => {
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as never)
    jest.mocked(useInvertColorsEnabled).mockReturnValue(false)
  })

  afterEach(() => {
    Platform.OS = originalPlatform
  })

  const renderCode = (codeValue = value, size = 300) =>
    render(
      <BasicAppContext>
        <ScannableQRCode value={codeValue} size={size} />
      </BasicAppContext>
    )

  it('draws the code dark on a light card, inside a quiet zone', () => {
    const { getByTestId, UNSAFE_getByType } = renderCode()

    expect(getByTestId(cardTestId)).toHaveStyle({ backgroundColor: white, padding: 16 })
    expect(UNSAFE_getByType(QRCode).props).toMatchObject({ value, size: 268, color: black, backgroundColor: white })
  })

  describe('on iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios'
    })

    it('opts the card out of Smart Invert, as a view the renderer keeps', () => {
      const { getByTestId } = renderCode()

      expect(getByTestId(cardTestId).props).toMatchObject({
        accessibilityIgnoresInvertColors: true,
        collapsable: false,
      })
    })

    it('does not redraw the code when inversion is reported on', () => {
      jest.mocked(useInvertColorsEnabled).mockReturnValue(true)

      const { getByTestId, UNSAFE_getByType } = renderCode()

      expect(getByTestId(cardTestId)).toHaveStyle({ backgroundColor: white })
      expect(UNSAFE_getByType(QRCode).props).toMatchObject({ color: black, backgroundColor: white })
    })
  })

  describe('on Android', () => {
    beforeEach(() => {
      Platform.OS = 'android'
    })

    it('draws the code dark on light while colour inversion is off', () => {
      const { getByTestId, UNSAFE_getByType } = renderCode()

      expect(getByTestId(cardTestId)).toHaveStyle({ backgroundColor: white })
      expect(UNSAFE_getByType(QRCode).props).toMatchObject({ color: black, backgroundColor: white })
    })

    it('draws the code and card inverted while colour inversion is on, so the display turns them back', () => {
      jest.mocked(useInvertColorsEnabled).mockReturnValue(true)

      const { getByTestId, UNSAFE_getByType } = renderCode()

      expect(getByTestId(cardTestId)).toHaveStyle({ backgroundColor: black })
      expect(UNSAFE_getByType(QRCode).props).toMatchObject({ color: white, backgroundColor: black })
    })
  })

  describe('when the value cannot be encoded', () => {
    // Over the 2,953 bytes a QR code holds at the lowest error correction level
    const tooLong = 'x'.repeat(3000)

    it('shows the generation error in place of the card, and logs it once', () => {
      const { queryByTestId, getByText } = renderCode(tooLong)

      expect(queryByTestId(cardTestId)).toBeNull()
      expect(getByText('QRRender.GenerationError')).toBeTruthy()
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[ScannableQRCode] Could not generate the QR code',
        expect.any(Error)
      )
    })

    it('draws the next value it is given', () => {
      const { rerender, getByTestId, queryByText } = renderCode(tooLong)

      rerender(
        <BasicAppContext>
          <ScannableQRCode value={value} size={300} />
        </BasicAppContext>
      )

      expect(getByTestId(cardTestId)).toBeTruthy()
      expect(queryByText('QRRender.GenerationError')).toBeNull()
    })
  })
})
