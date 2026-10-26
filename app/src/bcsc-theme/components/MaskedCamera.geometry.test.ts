import { getOvalGeometry } from './MaskedCamera'

// iPhone 14 Plus point size (the device in #4401)
const WINDOW_HEIGHT = 926
const WIDTH = 428
const MARGIN = 24

describe('getOvalGeometry', () => {
  it('matches the bifold oval when the preview has room for it', () => {
    const geometry = getOvalGeometry(WIDTH, 700, WINDOW_HEIGHT, MARGIN)

    expect(geometry.cx).toBe(WIDTH / 2)
    expect(geometry.cy).toBe(350)
    expect(geometry.rx).toBeCloseTo(WIDTH * 0.45)
    expect(geometry.ry).toBeCloseTo(WINDOW_HEIGHT * 0.28)
  })

  it('keeps a margin of preview above and below the oval when text bars shrink the preview', () => {
    const geometry = getOvalGeometry(WIDTH, 400, WINDOW_HEIGHT, MARGIN)

    expect(geometry.cy - geometry.ry).toBe(MARGIN)
    expect(geometry.cy + geometry.ry).toBe(400 - MARGIN)
    // The width follows the height so the oval keeps a face-like proportion
    expect(geometry.rx).toBeCloseTo(geometry.ry * 0.82)
  })

  it('never produces a negative radius for a preview smaller than the margins', () => {
    const geometry = getOvalGeometry(WIDTH, 20, WINDOW_HEIGHT, MARGIN)

    expect(geometry.ry).toBe(0)
    expect(geometry.rx).toBe(0)
  })
})
