import CardDetails from '@assets/img/card-details.svg'
import { useTheme } from '@bifold/core'

import React from 'react'
import { View } from 'react-native'

const GenericCardImage = () => {
  const { ColorPalette, Spacing } = useTheme()
  return (
    <View
      style={{
        backgroundColor: ColorPalette.grayscale.white,
        alignSelf: 'center',
        borderRadius: 12,
        padding: Spacing.sm,
        margin: Spacing.lg,
      }}
    >
      <CardDetails {...{ height: 80, width: 160 }} />
    </View>
  )
}

export default GenericCardImage
