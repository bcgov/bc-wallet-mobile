import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type CallErrorViewProps = {
  message: string
  onRetry?: () => void
  onGoBack: () => void
}

const CallErrorView = ({ message, onRetry, onGoBack }: CallErrorViewProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground, padding: Spacing.md }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Icon name="alert-circle" size={64} color={ColorPalette.semantic.error} />
        <ThemedText variant={'headingTwo'} style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
          {t('BCSC.VideoCall.Errors.ConnectionError')}
        </ThemedText>
        <ThemedText style={{ marginTop: Spacing.md, textAlign: 'center' }}>{message}</ThemedText>
      </View>
      <View style={{ gap: Spacing.sm }}>
        {onRetry && (
          <Button
            buttonType={ButtonType.Primary}
            onPress={onRetry}
            title={t('BCSC.VideoCall.Errors.TryAgain')}
            accessibilityLabel={t('BCSC.VideoCall.Errors.TryAgain')}
            testID={testIdWithKey('TryAgain')}
          />
        )}
        <Button
          buttonType={ButtonType.Secondary}
          onPress={onGoBack}
          title={t('BCSC.VideoCall.Errors.GoBack')}
          accessibilityLabel={t('BCSC.VideoCall.Errors.GoBack')}
          testID={testIdWithKey('GoBack')}
        />
      </View>
    </SafeAreaView>
  )
}

export default CallErrorView
