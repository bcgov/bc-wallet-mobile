import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
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

interface DestructiveConfirmationScreenProps {
  /** Heading rendered above the body content. */
  title: string
  /** Body content shown between the heading and the controls. */
  children: React.ReactNode
  /** Label for the critical confirm button. */
  confirmLabel: string
  /** Message shown on the loading overlay while the action runs. */
  loadingLabel: string
  /** Scope used to prefix log messages, e.g. 'RemoveAccount'. */
  logScope: string
  /** The destructive action. Should throw to signal failure. */
  action: () => Promise<void>
}

/**
 * Shared shell for destructive confirmation screens (remove account, reset wallet):
 * a heading, caller-provided body, and a single critical confirm button in a
 * ControlContainer. The stack's back button serves as the cancel affordance.
 *
 * Dismisses the screen and runs the action under a loading overlay; failures are
 * logged.
 */
const DestructiveConfirmationScreen: React.FC<DestructiveConfirmationScreenProps> = ({
  title,
  children,
  confirmLabel,
  loadingLabel,
  logScope,
  action,
}) => {
  const { Spacing } = useTheme()
  const navigation = useNavigation()
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [disabled, setDisabled] = useState(false)

  const onConfirm = async () => {
    if (disabled) {
      return
    }
    setDisabled(true)
    const stopLoading = loadingScreen.startLoading(loadingLabel)
    // Navigate back while still mounted so the navigation ref is fresh; the
    // loading overlay covers the previous screen until the action finishes.
    navigation.setOptions({ animationEnabled: false })
    navigation.goBack()
    try {
      logger.info(`[${logScope}] User confirmed destructive action, proceeding`)
      await action()
    } catch (error) {
      logger.error(`[${logScope}] Destructive action failed`, error as Error)
    } finally {
      stopLoading()
    }
  }

  const controls = (
    <ControlContainer>
      <Button
        accessibilityLabel={confirmLabel}
        buttonType={ButtonType.Critical}
        title={confirmLabel}
        testID={testIdWithKey('ConfirmDestructiveAction')}
        onPress={onConfirm}
        disabled={disabled}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
      edges={['bottom', 'left', 'right']}
      padded={false}
    >
      <ThemedText variant={'headingThree'}>{title}</ThemedText>
      {children}
    </ScreenWrapper>
  )
}

export default DestructiveConfirmationScreen
