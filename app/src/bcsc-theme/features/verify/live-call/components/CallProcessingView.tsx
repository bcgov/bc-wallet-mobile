import { ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { ActivityIndicator, View } from 'react-native'

type CallProcessingViewProps = {
  message?: string
}

const CallProcessingView = ({ message }: CallProcessingViewProps) => {
  const { Spacing } = useTheme()

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText variant={'headingThree'} style={{ textAlign: 'center', marginBottom: Spacing.lg }}>
          {message}
        </ThemedText>
        <ActivityIndicator size={'large'} />
      </View>
    </ScreenWrapper>
  )
}

export default CallProcessingView
