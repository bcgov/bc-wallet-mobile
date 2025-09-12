import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, Link, testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ServiceLoginScreenProps = StackScreenProps<BCSCRootStackParams, BCSCScreens.ServiceLoginScreen>

/**
 * Renders the service details screen component, which displays information about a specific service.
 *
 * @returns {*} {JSX.Element} The service screen component or null if not implemented.
 */
export const ServiceLoginScreen: React.FC<ServiceLoginScreenProps> = (props) => {
  const { service } = props.route.params
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      gap: Spacing.xxl,
    },
    buttonContainer: {},
    infoContainer: {
      borderRadius: Spacing.sm,
      borderColor: ColorPalette.brand.tertiary,
      borderWidth: 1,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      padding: Spacing.md,
    },
    link: {
      color: ColorPalette.brand.primary,
    },
  })

  const handleLogin = () => {}

  logger.info('Service', { service })

  // render an alternative screen if the service does not support OIDC login
  if (!service.initiate_login_uri) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <ThemedText variant={'headingThree'}>{service.client_name}</ThemedText>
        <ThemedText>{t('Services.NoLoginInstructions')}</ThemedText>
        <ThemedText>{t('Services.NoLoginProof')}</ThemedText>
        <Link
          linkText={`${t('Services.Goto')} ${service.client_name}`}
          onPress={() => Linking.openURL(service.client_uri)}
          testID={testIdWithKey('ServiceNoLoginLink')}
          style={styles.link}
        ></Link>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal' }}>
        {`${t('Services.WantToLogIn')}\n`}
        <ThemedText variant={'headingThree'}>{service.client_name}?</ThemedText>
      </ThemedText>

      <ThemedText>{t('Services.RequestedInformation')}</ThemedText>
      <View style={styles.infoContainer}>
        <ThemedText>{t('Services.FromAccount')}</ThemedText>
        <ThemedText>{service.claims_description}</ThemedText>
      </View>

      <View style={styles.infoContainer}>
        <ThemedText>{t('Services.PrivacyNotice')}</ThemedText>
      </View>
      <ThemedText style={{ fontWeight: 'bold' }}>
        {t('Services.NotYou')}
        <ThemedText>{t('Services.ReportSuspicious')}</ThemedText>
      </ThemedText>

      <View>
        <View style={{ marginBottom: 20 }}>
          <Button
            title="Continue"
            accessibilityLabel={'Continue'}
            testID={testIdWithKey('ServiceLoginContinue')}
            buttonType={ButtonType.Primary}
            onPress={handleLogin}
          />
        </View>
        <Button
          title="Cancel"
          accessibilityLabel={'Cancel'}
          testID={testIdWithKey('ServiceLoginCancel')}
          buttonType={ButtonType.ModalTertiary}
          onPress={() => props.navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  )
}
