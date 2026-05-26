import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface DeleteConfirmationScreenProps {
  title: string
  description: string
  confirmLabel: string
  loadingLabel: string
  onConfirm: (stopLoading: () => void) => Promise<void>
}

const DeleteConfirmationScreen: React.FC<DeleteConfirmationScreenProps> = ({
  title,
  description,
  confirmLabel,
  loadingLabel,
  onConfirm,
}) => {
  const { Spacing } = useTheme()
  const navigation = useNavigation()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const loadingScreen = useLoadingScreen()
  const [disabled, setDisabled] = useState(false)

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      flex: 1,
      justifyContent: 'space-between',
    },
    scrollView: {
      flexGrow: 1,
      gap: Spacing.md,
    },
    buttonsContainer: {
      gap: Spacing.md,
      marginTop: Spacing.lg,
    },
  })

  const onPress = async () => {
    if (disabled) {
      return
    }

    setDisabled(true)
    const stopLoading = loadingScreen.startLoading(loadingLabel)
    try {
      await onConfirm(stopLoading)
    } catch (error) {
      logger.error('[DeleteConfirmationScreen] Action failed', error as Error)
      stopLoading()
      setDisabled(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <ThemedText variant={'headingThree'}>{title}</ThemedText>
        <ThemedText>{description}</ThemedText>
      </ScrollView>
      <View style={styles.buttonsContainer}>
        <Button
          accessibilityLabel={confirmLabel}
          buttonType={ButtonType.Critical}
          title={confirmLabel}
          testID={testIdWithKey('ConfirmDestructiveAction')}
          onPress={onPress}
          disabled={disabled}
        />
        <Button
          accessibilityLabel={t('Global.Cancel')}
          testID={testIdWithKey('Cancel')}
          buttonType={ButtonType.Secondary}
          title={t('Global.Cancel')}
          onPress={() => navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  )
}

export default DeleteConfirmationScreen
