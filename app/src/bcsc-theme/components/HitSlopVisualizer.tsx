import React from 'react'
import { View } from 'react-native'

type HitSlopRect = { top?: number; bottom?: number; left?: number; right?: number }

interface HitSlopVisualizerProps {
  hitSlop: number | HitSlopRect
  children: React.ReactNode
}

const normalize = (hitSlop: number | HitSlopRect): Required<HitSlopRect> => {
  if (typeof hitSlop === 'number') {
    return { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }
  }
  const { top = 0, bottom = 0, left = 0, right = 0 } = hitSlop
  return { top, bottom, left, right }
}

const HitSlopVisualizer: React.FC<HitSlopVisualizerProps> = ({ hitSlop, children }) => {
  const { top, bottom, left, right } = normalize(hitSlop)

  return (
    <View style={{ position: 'relative' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -top,
          bottom: -bottom,
          left: -left,
          right: -right,
          borderWidth: 2,
          borderColor: 'red',
        }}
      />
      {children}
    </View>
  )
}

export default HitSlopVisualizer
