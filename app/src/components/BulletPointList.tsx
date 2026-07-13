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
  return (
    <View style={style}>
      {translationKeys.map((key) => (
        <BulletPointWithText
          key={key}
          translationKey={key}
          iconSize={iconSize}
          iconColor={iconColor}
          containerStyle={itemContainerStyle}
        />
      ))}
    </View>
  )
}

export default BulletPointList
