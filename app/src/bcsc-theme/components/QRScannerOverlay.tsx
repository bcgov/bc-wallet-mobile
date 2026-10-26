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
// Camera area kept visible below the reticle when the message above it pushes it down
const CUTOUT_MIN_BOTTOM_GAP = 24

export interface CutoutRect {
  x: number
  y: number
  size: number
}

/**
 * Reticle cutout rect for a camera area of the given dimensions. Shared with screens so
 * content (e.g. scan instructions) can be positioned relative to the reticle.
 *
 * `minY` is the space the content above the reticle needs. The reticle sits at the design
 * position while that fits, and otherwise moves down and shrinks so the message never
 * spills over it, as it would at large OS font sizes (#4401).
 */
export const getCutoutRect = (width: number, height: number, minY = 0): CutoutRect => {
  const designSize = width * CUTOUT_WIDTH_RATIO
  const y = Math.max(height * CUTOUT_CENTER_Y_RATIO - designSize / 2, minY)
  const size = Math.max(0, Math.min(designSize, height - CUTOUT_MIN_BOTTOM_GAP - y))

  return {
    x: (width - size) / 2,
    y,
    size,
  }
}

interface QRScannerOverlayProps {
  /** Width of the camera area the overlay covers */
  width: number
  /** Height of the camera area the overlay covers */
  height: number
  /** Space the content above the reticle needs; see `getCutoutRect` */
  minCutoutY?: number
}

/**
 * Scanner overlay: dims the camera view and cuts out a rounded-square reticle with a white
 * border, centered horizontally and sitting slightly above the vertical center.
 */
export const QRScannerOverlay = ({ width, height, minCutoutY }: QRScannerOverlayProps) => {
  const { ColorPalette } = useTheme()

  const cutout = getCutoutRect(width, height, minCutoutY)

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
