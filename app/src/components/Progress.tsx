import { ColorPallet, useTheme } from '@hyperledger/aries-bifold-core'
import { StyleSheet, Text, TextStyle, View } from 'react-native'

import ProgressBar from './ProgressBar'

type Props = {
  progressPercent: number
  progressText: string
  progressFill?: keyof (typeof ColorPallet)['brand']
  textStyle?: TextStyle
}

const Progress = ({ progressPercent, progressFill: color, progressText, textStyle }: Props) => {
  const { TextTheme } = useTheme()
  const style = StyleSheet.create({
    progress: {
      paddingVertical: 8,
    },
    bodyText: {
      ...TextTheme.normal,
      flexShrink: 1,
      paddingVertical: 10,
    },
  })

  const renderProgressBar = () => {
    return color ? (
      <ProgressBar progressPercent={progressPercent} color={color} />
    ) : (
      <ProgressBar progressPercent={progressPercent} />
    )
  }

  return (
    <>
      <View style={style.progress}>{renderProgressBar()}</View>
      <Text style={[textStyle ?? style.bodyText, { textAlign: 'center' }]}>{progressText}</Text>
    </>
  )
}

export default Progress
