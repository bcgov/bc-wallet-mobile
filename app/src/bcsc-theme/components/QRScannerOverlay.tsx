import { useTheme } from '@bifold/core'
import { useWindowDimensions } from 'react-native'
import Svg, { Defs, Mask, Rect } from 'react-native-svg'

// Reticle proportions from the design: a 254pt rounded square centered on a 375pt-wide screen.
const CUTOUT_WIDTH_RATIO = 254 / 375
const CUTOUT_CORNER_RADIUS = 17
const CUTOUT_STROKE_WIDTH = 3
const OVERLAY_OPACITY = 0.6

/**
 * Full-screen scanner overlay: dims the camera view and cuts out a centered rounded-square
 * reticle with a white border.
 */
export const QRScannerOverlay = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const { ColorPalette } = useTheme()

  const cutoutSize = screenWidth * CUTOUT_WIDTH_RATIO
  const cutoutX = (screenWidth - cutoutSize) / 2
  const cutoutY = (screenHeight - cutoutSize) / 2

  return (
    <Svg width={screenWidth} height={screenHeight} style={{ position: 'absolute' }}>
      <Defs>
        <Mask id="reticleMask">
          <Rect width={screenWidth} height={screenHeight} fill="white" />
          <Rect x={cutoutX} y={cutoutY} width={cutoutSize} height={cutoutSize} rx={CUTOUT_CORNER_RADIUS} fill="black" />
        </Mask>
      </Defs>
      <Rect
        width={screenWidth}
        height={screenHeight}
        fill="black"
        fillOpacity={OVERLAY_OPACITY}
        mask="url(#reticleMask)"
      />
      <Rect
        x={cutoutX}
        y={cutoutY}
        width={cutoutSize}
        height={cutoutSize}
        rx={CUTOUT_CORNER_RADIUS}
        fill="transparent"
        stroke={ColorPalette.grayscale.white}
        strokeWidth={CUTOUT_STROKE_WIDTH}
      />
    </Svg>
  )
}
