import { useTheme } from '@bifold/core'
import React from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'

import BulletPointWithText from './BulletPointWithText'

interface BulletPointListProps {
  translationKeys: string[]
  iconSize?: number
  iconColor?: string
  itemContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
}

const BulletPointList: React.FC<BulletPointListProps> = ({
  translationKeys,
  iconSize,
  iconColor,
  itemContainerStyle,
  style,
}) => {
  const { Spacing } = useTheme()
  const defaultItemStyle: StyleProp<ViewStyle> = { marginVertical: Spacing.xs }

  return (
    <View style={style}>
      {translationKeys.map((key) => (
        <BulletPointWithText
          key={key}
          translationKey={key}
          iconSize={iconSize}
          iconColor={iconColor}
          containerStyle={itemContainerStyle ?? defaultItemStyle}
        />
      ))}
    </View>
  )
}

export default BulletPointList
