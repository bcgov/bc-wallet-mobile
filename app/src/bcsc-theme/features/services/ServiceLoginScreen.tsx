import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { BCState, Mode } from '@/store'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

type ServiceLoginScreenProps = StackScreenProps<BCSCRootStackParams, BCSCScreens.ServiceLoginScreen>

/**
 * Renders the service details screen component, which displays information about a specific serviceClient.
 *
 * @returns {*} {JSX.Element} The service screen component or null if not implemented.
 */
export const ServiceLoginScreen: React.FC<ServiceLoginScreenProps> = (props: ServiceLoginScreenProps) => {
  const { serviceClient } = props.route.params
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [quickLoginUrl, quickLoginError] = useQuickLoginURL(serviceClient)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const isBCSCMode = store.mode === Mode.BCSC // isDarkMode? or isBCSCMode?
  const privacyPolicyUri = serviceClient.policy_uri

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      gap: Spacing.xl,
    },
    cardsContainer: {
      gap: Spacing.lg,
    },
    descriptionText: {
      lineHeight: 30,
    },
    continueButtonContainer: {
      marginBottom: 10,
    },
    buttonsContainer: {
      marginTop: 'auto',
    },
    infoContainer: {
      borderRadius: Spacing.sm,
      borderColor: isBCSCMode ? '#1E5189' : '#D8D8D8',
      borderWidth: 1,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      padding: Spacing.md,
    },
    infoHeader: {
      fontSize: TextTheme.headerTitle.fontSize,
      color: ColorPalette.brand.primary,
    },
    privacyNoticeContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    link: {
      color: ColorPalette.brand.primary,
    },
  })

  // render an alternative screen if the serviceClient does not support OIDC login
  if (!serviceClient.initiate_login_uri) {
    return (
      <SafeAreaView style={styles.screenContainer} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.screenContainer}>
            <ThemedText variant={'headingThree'}>{serviceClient.client_name}</ThemedText>
            <ThemedText style={styles.descriptionText}>{t('Services.NoLoginInstructions')}</ThemedText>
            <ThemedText style={styles.descriptionText}>{t('Services.NoLoginProof')}</ThemedText>

            <TouchableOpacity
              onPress={() => {
                Linking.openURL(serviceClient.client_uri)
              }}
            >
              <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
                <ThemedText style={styles.infoHeader}>
                  {t('Services.Goto')} {serviceClient.client_name}
                </ThemedText>
                <Icon name="open-in-new" size={30} color={ColorPalette.brand.primary} />
              </View>
            </TouchableOpacity>

            {/* TODO (MD): Find out what action should happen when user reports suspicious activity */}
            <ThemedText variant={'bold'}>
              {t('Services.ReportSuspiciousPrefix')} <ThemedText>{t('Services.ReportSuspicious')}</ThemedText>
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.screenContainer}>
          <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal' }}>
            {`${t('Services.WantToLogin')}\n`}
            <ThemedText variant={'headingThree'}>{serviceClient.client_name}?</ThemedText>
          </ThemedText>

          <ThemedText style={styles.descriptionText}>{t('Services.RequestedInformation')}</ThemedText>

          <View style={styles.cardsContainer}>
            <View style={styles.infoContainer}>
              <ThemedText style={[styles.infoHeader, { marginBottom: Spacing.sm }]}>
                {t('Services.FromAccountPrefix')}
                <ThemedText variant={'bold'} style={{ color: ColorPalette.brand.primary }}>
                  {' '}
                  {t('Services.FromAccount')}
                </ThemedText>
              </ThemedText>
              <ThemedText>{serviceClient.claims_description}</ThemedText>
            </View>

            {privacyPolicyUri ? (
              <TouchableOpacity
                onPress={() => {
                  try {
                    props.navigation.navigate(BCSCScreens.WebView, {
                      url: privacyPolicyUri,
                      title: t('Services.PrivacyPolicy'),
                    })
                  } catch (error) {
                    logger.error(`Error navigating to the service client privacy policy webview: ${error}`)
                  }
                }}
              >
                <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
                  <ThemedText style={styles.infoHeader}>{t('Services.PrivacyNotice')}</ThemedText>
                  <Icon name="open-in-new" size={30} color={ColorPalette.brand.primary} />
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          <ThemedText variant={'bold'}>
            {t('Services.ReportSuspiciousPrefix')} <ThemedText>{t('Services.ReportSuspicious')}</ThemedText>
          </ThemedText>

          <View style={styles.buttonsContainer}>
            <View style={styles.continueButtonContainer}>
              <Button
                title="Continue"
                accessibilityLabel={'Continue'}
                testID={testIdWithKey('ServiceLoginContinue')}
                buttonType={ButtonType.Primary}
                onPress={() => {
                  if (quickLoginUrl) {
                    Linking.openURL(quickLoginUrl)
                    return
                  }

                  // This should never happen, but just in case...
                  Alert.alert(t('Services.LoginErrorTitle'), quickLoginError ?? undefined)
                }}
              />
            </View>
            <Button
              title="Cancel"
              accessibilityLabel={'Cancel'}
              testID={testIdWithKey('ServiceLoginCancel')}
              buttonType={ButtonType.Tertiary}
              onPress={() => props.navigation.goBack()}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
