import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

interface DeleteConfirmationScreenProps {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void>
}

const DeleteConfirmationScreen: React.FC<DeleteConfirmationScreenProps> = ({
  title,
  description,
  confirmLabel,
  onConfirm,
}) => {
  const { Spacing } = useTheme()
  const navigation = useNavigation()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [disabled, setDisabled] = useState(false)

  const styles = StyleSheet.create({
    content: {
      // flexGrow lets the content fill the viewport so the controls stay pinned to the bottom.
      flexGrow: 1,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
  })

  const onPress = async () => {
    if (disabled) {
      return
    }

    setDisabled(true)
    try {
      await onConfirm()
    } catch (error) {
      logger.error('[DeleteConfirmationScreen] Action failed', error as Error)
      setDisabled(false)
    }
  }

  const controls = (
    <ControlContainer>
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
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      edges={['bottom', 'left', 'right']}
      scrollViewContainerStyle={styles.content}
    >
      <ThemedText variant={'headingThree'}>{title}</ThemedText>
      <ThemedText>{description}</ThemedText>
    </ScreenWrapper>
  )
}

export default DeleteConfirmationScreen
