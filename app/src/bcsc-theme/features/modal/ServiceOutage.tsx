import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { TestIds } from '@/test-ids/registry'
import { openLink } from '@/utils/links'
import {
  Button,
  ButtonType,
  Link,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useTheme,
} from '@bifold/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import useServiceOutageViewModel from './useServiceOutageViewModel'

// TODO: replace inOnboarding with onSkipVerification function, if the fucntion is available, show the button
export interface ServiceOutageProps {
  inOnboarding?: boolean
  onSkipVerification?: () => void
}

export const ServiceOutage = ({ inOnboarding = false, onSkipVerification }: ServiceOutageProps): React.ReactElement => {
  const {
    headerText,
    contentText,
    inTheMeantimeText,
    needHelpPrefixText,
    contactUsLinkText,
    contactLink,
    buttonText,
    skipVerificationText,
    isCheckDisabled,
    handleCheckAgain,
  } = useServiceOutageViewModel()
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const [loading, setLoading] = useState(false)
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.modalPrimaryBackground,
    },
    scrollContainer: {},
    icon: {
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
      <Icon name="error-outline" size={75} color={ColorPalette.brand.icon} style={styles.icon} />
      <View style={styles.textContainer}>
        <ThemedText variant="headingThree">{headerText}</ThemedText>
        {contentText.filter(Boolean).map((text) => (
          <ThemedText key={text} style={styles.textContent}>
            {text}
          </ThemedText>
        ))}

        <ThemedText style={styles.textContent}>{inTheMeantimeText}</ThemedText>

        <ThemedText style={styles.textContent}>
          {needHelpPrefixText}
          <Link
            linkText={contactUsLinkText}
            onPress={() => openLink(contactLink)}
            textProps={{ accessibilityHint: t('Global.A11y.OpensInBrowser') }}
            testID={testIdWithKey(TestIds.systemModal.serviceOutage.contactUs)}
          />
        </ThemedText>
      </View>
    </ScreenWrapper>
  )
}
