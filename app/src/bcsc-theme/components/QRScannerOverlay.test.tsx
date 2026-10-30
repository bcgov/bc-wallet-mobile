import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { getCutoutRect, QRScannerOverlay } from './QRScannerOverlay'

// The design's camera area: 375pt-wide frame, 707pt below the header
const DESIGN_WIDTH = 375
const DESIGN_HEIGHT = 707

describe('QRScannerOverlay', () => {
  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <QRScannerOverlay width={DESIGN_WIDTH} height={DESIGN_HEIGHT} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('positions the reticle per the design at design dimensions', () => {
    const cutout = getCutoutRect(DESIGN_WIDTH, DESIGN_HEIGHT)

    // 254pt square centered horizontally (x=60.5), 199pt below the header (Figma node 1229:3987)
    expect(cutout.size).toBeCloseTo(254)
    expect(cutout.x).toBeCloseTo(60.5)
    expect(cutout.y).toBeCloseTo(199)
  })

  it('keeps the design position while the content above the reticle fits in the gap', () => {
    expect(getCutoutRect(DESIGN_WIDTH, DESIGN_HEIGHT, 150)).toEqual(getCutoutRect(DESIGN_WIDTH, DESIGN_HEIGHT))
  })

  it('moves the reticle down below taller content and keeps its size while there is room', () => {
    const cutout = getCutoutRect(DESIGN_WIDTH, DESIGN_HEIGHT, 300)

    expect(cutout.y).toBe(300)
    expect(cutout.size).toBeCloseTo(254)
    expect(cutout.x).toBeCloseTo(60.5)
  })

  it('shrinks the reticle, re-centered, once it would run off the bottom of the camera area', () => {
    const cutout = getCutoutRect(DESIGN_WIDTH, DESIGN_HEIGHT, 500)

    expect(cutout.y).toBe(500)
    expect(cutout.size).toBe(DESIGN_HEIGHT - 24 - 500)
    expect(cutout.x).toBeCloseTo((DESIGN_WIDTH - cutout.size) / 2)
  })
})
