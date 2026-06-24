import React from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

interface ContentShadowProps {
  /** Shadow colour. Defaults to black. */
  color?: string
  /** Opacity at the bottom edge (where it meets the controls). Defaults to 0.15. */
  opacity?: number
  /** Height of the shadow band in px. Defaults to 10. */
  height?: number
}

/**
 * A subtle top-edge drop shadow rendered as an SVG overlay. Mirrors ContentGradient's
 * positioning (absolutely pinned just above its parent — typically a controls container) but
 * draws a shadow (transparent → semi-opaque colour) instead of a fade-to-background.
 *
 * Use it above a controls bar that sits over content a plain React Native / elevation shadow
 * can't paint over — most notably a native WebView, which composites above RN's shadow layers.
 * SVG, by contrast, composites over the WebView, so the shadow is actually visible there.
 */
export const ContentShadow = ({ color = '#000', opacity = 0.15, height = 10 }: ContentShadowProps) => {
  const id = 'contentShadow'
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      height,
      width: '100%',
      top: -height,
    },
  })

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg height={`${height}`} width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity={0} />
            <Stop offset="100%" stopColor={color} stopOpacity={opacity} />
          </LinearGradient>
        </Defs>
        <Rect height={`${height}`} width="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

export default ContentShadow
