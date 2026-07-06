import { useTheme } from '@bifold/core'
import Svg, { Defs, Mask, Rect } from 'react-native-svg'

// Reticle geometry from the design (375pt-wide frame, 707pt-tall camera area below the header):
// a 254pt rounded square, centered horizontally, with its center at 326pt of the camera area —
// slightly above the vertical center.
const CUTOUT_WIDTH_RATIO = 254 / 375
const CUTOUT_CENTER_Y_RATIO = 326 / 707
const CUTOUT_CORNER_RADIUS = 17
const CUTOUT_STROKE_WIDTH = 3
const OVERLAY_OPACITY = 0.6

export interface CutoutRect {
  x: number
  y: number
  size: number
}

/**
 * Reticle cutout rect for a camera area of the given dimensions. Shared with screens so
 * content (e.g. scan instructions) can be positioned relative to the reticle.
 */
export const getCutoutRect = (width: number, height: number): CutoutRect => {
  const size = width * CUTOUT_WIDTH_RATIO
  return {
    x: (width - size) / 2,
    y: height * CUTOUT_CENTER_Y_RATIO - size / 2,
    size,
  }
}

interface QRScannerOverlayProps {
  /** Width of the camera area the overlay covers */
  width: number
  /** Height of the camera area the overlay covers */
  height: number
}

/**
 * Scanner overlay: dims the camera view and cuts out a rounded-square reticle with a white
 * border, centered horizontally and sitting slightly above the vertical center.
 */
export const QRScannerOverlay = ({ width, height }: QRScannerOverlayProps) => {
  const { ColorPalette } = useTheme()

  const cutout = getCutoutRect(width, height)

  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }}>
      <Defs>
        <Mask id="reticleMask">
          <Rect width={width} height={height} fill="white" />
          <Rect
            x={cutout.x}
            y={cutout.y}
            width={cutout.size}
            height={cutout.size}
            rx={CUTOUT_CORNER_RADIUS}
            fill="black"
          />
        </Mask>
      </Defs>
      <Rect width={width} height={height} fill="black" fillOpacity={OVERLAY_OPACITY} mask="url(#reticleMask)" />
      <Rect
        x={cutout.x}
        y={cutout.y}
        width={cutout.size}
        height={cutout.size}
        rx={CUTOUT_CORNER_RADIUS}
        fill="transparent"
        stroke={ColorPalette.grayscale.white}
        strokeWidth={CUTOUT_STROKE_WIDTH}
      />
    </Svg>
  )
}
