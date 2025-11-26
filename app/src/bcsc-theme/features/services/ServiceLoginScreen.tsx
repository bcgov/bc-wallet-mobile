import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState, Mode } from '@/store'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

type ServiceLoginScreenProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.ServiceLogin>

/**
 * Renders the service details screen component, which displays information about a specific serviceClient.
 *
 * @returns {*} {JSX.Element} The service screen component or null if not implemented.
 */
export const ServiceLoginScreen: React.FC<ServiceLoginScreenProps> = ({
  navigation,
  route,
}: ServiceLoginScreenProps) => {
  const { serviceClient } = route.params
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const getQuickLoginURL = useQuickLoginURL()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const isBCSCMode = store.mode === Mode.BCSC // isDarkMode? or isBCSCMode?
  const privacyPolicyUri = serviceClient.policy_uri

  const styles = StyleSheet.create({
    screenContainer: {
      flexGrow: 1,
    },
    cardsContainer: {
      gap: Spacing.md,
    },
    descriptionText: {
      lineHeight: 30,
    },
    continueButtonContainer: {
      marginBottom: 10,
    },
    contentContainer: {
      flex: 1,
      gap: Spacing.md,
    },
    buttonsContainer: {
      marginTop: 'auto',
    },
    infoContainer: {
      display: 'flex',
      overflow: 'hidden',
      gap: Spacing.md,
      borderRadius: Spacing.sm,
      borderColor: isBCSCMode ? '#1E5189' : '#D8D8D8',
      borderWidth: 1,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      padding: Spacing.md,
    },
    infoHeader: {
      flexShrink: 1,
      fontSize: TextTheme.headerTitle.fontSize,
      color: ColorPalette.brand.primary,
    },
    infoIcon: {
      flexShrink: 0,
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
      <ScreenWrapper edges={['bottom']} scrollViewContainerStyle={styles.screenContainer}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'}>{serviceClient.client_name}</ThemedText>
          <ThemedText style={styles.descriptionText}>{t('BCSC.Services.NoLoginInstructions')}</ThemedText>
          <ThemedText style={styles.descriptionText}>{t('BCSC.Services.NoLoginProof')}</ThemedText>

          <TouchableOpacity
            onPress={() => {
              Linking.openURL(serviceClient.client_uri)
            }}
          >
            <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
              <ThemedText style={styles.infoHeader} ellipsizeMode="tail">
                {t('BCSC.Services.Goto')} {serviceClient.client_name}
              </ThemedText>
              <Icon style={styles.infoIcon} name="open-in-new" size={30} color={ColorPalette.brand.primary} />
            </View>
          </TouchableOpacity>

          {/* TODO (MD): Find out what action should happen when user reports suspicious activity */}
          <ThemedText variant={'bold'}>
            {t('BCSC.Services.ReportSuspiciousPrefix')} <ThemedText>{t('BCSC.Services.ReportSuspicious')}</ThemedText>
          </ThemedText>
        </View>
      </ScreenWrapper>
    )
  }

  return (
    <ScreenWrapper edges={['bottom']} scrollViewContainerStyle={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal' }}>
          {`${t('BCSC.Services.WantToLogin')}\n`}
          <ThemedText variant={'headingThree'}>{serviceClient.client_name}?</ThemedText>
        </ThemedText>

        <ThemedText style={styles.descriptionText}>{t('BCSC.Services.RequestedInformation')}</ThemedText>

        <View style={styles.cardsContainer}>
          <View style={styles.infoContainer}>
            <ThemedText style={[styles.infoHeader, { marginBottom: Spacing.sm }]}>
              {t('BCSC.Services.FromAccountPrefix')}
              <ThemedText variant={'bold'} style={{ color: ColorPalette.brand.primary }}>
                {' '}
                {t('BCSC.Services.FromAccount')}
              </ThemedText>
            </ThemedText>
            <ThemedText>{serviceClient.claims_description}</ThemedText>
          </View>

          {privacyPolicyUri ? (
            <TouchableOpacity
              onPress={() => {
                try {
                  navigation.navigate(BCSCScreens.MainWebView, {
                    url: privacyPolicyUri,
                    title: t('BCSC.Services.PrivacyPolicy'),
                  })
                } catch (error) {
                  logger.error(`Error navigating to the service client privacy policy webview: ${error}`)
                }
              }}
            >
              <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
                <ThemedText style={styles.infoHeader}>{t('BCSC.Services.PrivacyNotice')}</ThemedText>
                <Icon name="open-in-new" size={30} color={ColorPalette.brand.primary} />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        <ThemedText variant={'bold'}>
          {t('BCSC.Services.ReportSuspiciousPrefix')} <ThemedText>{t('BCSC.Services.ReportSuspicious')}</ThemedText>
        </ThemedText>
      </View>
      <View style={styles.buttonsContainer}>
        <View style={styles.continueButtonContainer}>
          <Button
            title="Continue"
            accessibilityLabel={'Continue'}
            testID={testIdWithKey('ServiceLoginContinue')}
            buttonType={ButtonType.Primary}
            onPress={async () => {
              const generateQuickLogin = await getQuickLoginURL(serviceClient)

              if (generateQuickLogin.success) {
                Linking.openURL(generateQuickLogin.url)
                return
              }

              Alert.alert(t('BCSC.Services.LoginErrorTitle'), generateQuickLogin.error)
            }}
          />
        </View>
        <Button
          title="Cancel"
          accessibilityLabel={'Cancel'}
          testID={testIdWithKey('ServiceLoginCancel')}
          buttonType={ButtonType.Tertiary}
          onPress={() => navigation.goBack()}
        />
      </View>
    </ScreenWrapper>
  )
}
