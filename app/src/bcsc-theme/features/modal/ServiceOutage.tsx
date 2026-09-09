import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import usePreventGestureBack from '@/hooks/usePreventGestureBack'
import { TestIds } from '@/test-ids/registry'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useTheme,
} from '@bifold/core'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import useServiceOutageViewModel from './useServiceOutageViewModel'

// TODO: replace inOnboarding with onSkipVerification function, if the fucntion is available, show the button
export interface ServiceOutageProps {
  inOnboarding?: boolean
  onSkipVerification?: () => void
}

export const ServiceOutage = ({ inOnboarding = false, onSkipVerification }: ServiceOutageProps): React.ReactElement => {
  const { headerText, contentText, buttonText, skipVerificationText, isCheckDisabled, handleCheckAgain } =
    useServiceOutageViewModel()
  const { ButtonLoading } = useAnimatedComponents()
  const [loading, setLoading] = useState(false)
  const { Spacing, ColorPalette } = useTheme()

  usePreventGestureBack()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.modalPrimaryBackground,
    },
    scrollContainer: {},
    icon: {
      paddingVertical: Spacing.lg,
      alignSelf: 'center',
    },
    buttonContainer: {
      padding: Spacing.md,
    },
    textContent: {
      lineHeight: 30,
    },
    textContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
  })

  const handleControls = async () => {
    setLoading(true)
    await handleCheckAgain()
    setLoading(false)
  }

  const controls = (
    <ControlContainer>
      <Button
        title={buttonText}
        buttonType={ButtonType.Primary}
        onPress={handleControls}
        disabled={isCheckDisabled}
        accessibilityLabel={buttonText}
        testID={testIdWithKey(TestIds.systemModal.serviceOutage.checkAgain)}
      >
        {loading && <ButtonLoading />}
      </Button>
      {inOnboarding && onSkipVerification && (
        <Button
          title={skipVerificationText}
          buttonType={ButtonType.Secondary}
          onPress={onSkipVerification}
          accessibilityLabel={skipVerificationText}
          testID={testIdWithKey(TestIds.systemModal.serviceOutage.skipVerification)}
        />
      )}
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      keyboardActive
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <Icon name="error-outline" size={100} color={ColorPalette.brand.icon} style={styles.icon} />
      <View style={styles.textContainer}>
        <ThemedText variant="headingThree">{headerText}</ThemedText>
        {contentText.filter(Boolean).map((text) => (
          <ThemedText key={text} style={styles.textContent}>
            {text}
          </ThemedText>
        ))}

        <ThemedText style={styles.textContent}>
          {"In the meantime, check the service you're trying to access for other ways to log in."}
        </ThemedText>

        <ThemedText style={styles.textContent}>{'If you need help, contact us'}</ThemedText>
      </View>
    </ScreenWrapper>
  )
}
