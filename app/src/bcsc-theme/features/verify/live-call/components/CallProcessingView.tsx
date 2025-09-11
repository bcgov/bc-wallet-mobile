import { ThemedText, useTheme } from '@bifold/core'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type CallProcessingViewProps = {
  message?: string
}

const CallProcessingView = ({ message }: CallProcessingViewProps) => {
  const { Spacing, ColorPalette } = useTheme()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer}>
      <ThemedText variant={'headingThree'} style={{ textAlign: 'center', marginBottom: Spacing.lg }}>
        {message}
      </ThemedText>
      <ActivityIndicator size={'large'} />
    </SafeAreaView>
  )
}

export default CallProcessingView
