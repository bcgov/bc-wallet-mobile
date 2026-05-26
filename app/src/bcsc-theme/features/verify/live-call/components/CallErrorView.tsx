import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type CallErrorViewProps = {
  title?: string
  message: string
  onRetry?: () => void
  onGoBack: () => void
}

const CallErrorView = ({ title, message, onRetry, onGoBack }: CallErrorViewProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const controls = (
    <ControlContainer>
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
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={['top', 'bottom', 'left', 'right']} controls={controls}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }}>
        <Icon name="alert-circle" size={64} color={ColorPalette.semantic.error} />
        <ThemedText variant={'headingThree'} style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
          {title || t('BCSC.VideoCall.Errors.ConnectionError')}
        </ThemedText>
        <ThemedText style={{ marginTop: Spacing.md, textAlign: 'center' }}>{message}</ThemedText>
      </View>
    </ScreenWrapper>
  )
}

export default CallErrorView
