import CardDetails from '@assets/img/card-details.svg'
import { useTheme } from '@bifold/core'
import React from 'react'
import { View } from 'react-native'

export const GENERIC_CARD_SIZE_SMALL = { height: 45, width: 72 }
export const GENERIC_CARD_SIZE_MEDIUM = { height: 75, width: 120 }

interface GenericCardImageProps {
  height?: number
  width?: number
}

const GenericCardImage = ({ height, width }: GenericCardImageProps) => {
  const { ColorPalette, Spacing } = useTheme()

  return (
    <View
      style={{
        backgroundColor: ColorPalette.grayscale.white,
        alignSelf: 'center',
        borderRadius: Spacing.sm,
        padding: Spacing.sm,
        margin: Spacing.lg,
      }}
    >
      <CardDetails height={height ?? GENERIC_CARD_SIZE_MEDIUM.height} width={width ?? GENERIC_CARD_SIZE_MEDIUM.width} />
    </View>
  )
}

export default GenericCardImage
