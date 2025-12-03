import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useDeepLinkViewModel } from '@/contexts/DeepLinkViewModelContext'
import { DeepLinkPayload } from '@/services/deep-linking'
import { BCState, Mode } from '@/store'
import { TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFilterServiceClients } from './hooks/useFilterServiceClients'
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
  const { serviceClientId } = route.params ?? {}
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [pendingDeepLink, setPendingDeepLink] = useState<DeepLinkPayload | null>(null)
  const isBCSCMode = store.mode === Mode.BCSC // isDarkMode? or isBCSCMode?
  const viewModel = useDeepLinkViewModel()

  console.log('ServiceLoginScreen rendered with serviceClientId:', serviceClientId, pendingDeepLink?.serviceTitle)

  const { isLoading, serviceClients } = useFilterServiceClients({
    serviceClientIdsFilter: serviceClientId ? [serviceClientId] : undefined,
    fullNameFilter: pendingDeepLink ? pendingDeepLink.serviceTitle : undefined,
  })

  const serviceClient = serviceClients[0]
  const privacyPolicyUri = serviceClient && serviceClient.policy_uri

  // if (serviceClients.length === 0) {
  //   logger.error('ServiceLoginScreen requires service client')
  //   navigation.goBack()

  //   return null
  // }

  const styles = StyleSheet.create({
    screenContainer: {
      flexGrow: 1,
      padding: Spacing.md,
      justifyContent: 'space-between',
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

  useEffect(() => {
    if (!pendingDeepLink && viewModel.hasPendingDeepLink) {
      const pending = viewModel.consumePendingDeepLink()
      console.log('ServiceLoginScreen consumed pending deep link:', pending?.serviceTitle)
      setPendingDeepLink(pending)
    }
  }, [pendingDeepLink, viewModel])

  const ServiceLoginLoadingView = () => (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </SafeAreaView>
  )

  const ServiceLoginUnavailableView = () => (
    <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'}>{serviceClient.client_name ?? 'dddd'}</ThemedText>
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
      </ScrollView>
    </SafeAreaView>
  )

  const renderState = (() => {
    if (isLoading || serviceClient === undefined) return 'loading'
    if (!pendingDeepLink && serviceClient && !serviceClient.initiate_login_uri) return 'unavailable'
    return 'default'
  })()

  switch (renderState) {
    case 'loading':
      // loading data
      return <ServiceLoginLoadingView />
    case 'unavailable':
      // render an alternative screen if the serviceClient does
      // not support OIDC login
      return <ServiceLoginUnavailableView /> // ServiceLoginUnavailableView
    default:
      return <ServiceLoginLoadingView /> // ServiceLoginDefaultView
  }

  // if (isLoading || serviceClient === undefined) {
  //   return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  // }

  // render an alternative screen if the serviceClient does
  // not support OIDC login
  // if (!pendingDeepLink && serviceClient && !serviceClient.initiate_login_uri) {
  //   return (
  //     <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
  //       <ScrollView contentContainerStyle={styles.screenContainer}>
  //         <View style={styles.contentContainer}>
  //           <ThemedText variant={'headingThree'}>{serviceClient.client_name ?? 'dddd'}</ThemedText>
  //           <ThemedText style={styles.descriptionText}>{t('BCSC.Services.NoLoginInstructions')}</ThemedText>
  //           <ThemedText style={styles.descriptionText}>{t('BCSC.Services.NoLoginProof')}</ThemedText>

  //           <TouchableOpacity
  //             onPress={() => {
  //               Linking.openURL(serviceClient.client_uri)
  //             }}
  //           >
  //             <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
  //               <ThemedText style={styles.infoHeader} ellipsizeMode="tail">
  //                 {t('BCSC.Services.Goto')} {serviceClient.client_name}
  //               </ThemedText>
  //               <Icon style={styles.infoIcon} name="open-in-new" size={30} color={ColorPalette.brand.primary} />
  //             </View>
  //           </TouchableOpacity>

  //           {/* TODO (MD): Find out what action should happen when user reports suspicious activity */}
  //           <ThemedText variant={'bold'}>
  //             {t('BCSC.Services.ReportSuspiciousPrefix')} <ThemedText>{t('BCSC.Services.ReportSuspicious')}</ThemedText>
  //           </ThemedText>
  //         </View>
  //       </ScrollView>
  //     </SafeAreaView>
  //   )
  // }

  // return (
  //   <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
  //     <ScrollView contentContainerStyle={styles.screenContainer}>
  //       <View style={styles.contentContainer}>
  //         <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal' }}>
  //           {`${t('BCSC.Services.WantToLogin')}\n`}{' '}
  //           <ThemedText variant={'headingThree'}>{serviceClient.client_name}?</ThemedText>
  //         </ThemedText>

  //         <ThemedText style={styles.descriptionText}>{t('BCSC.Services.RequestedInformation')}</ThemedText>

  //         <View style={styles.cardsContainer}>
  //           <View style={styles.infoContainer}>
  //             <ThemedText style={[styles.infoHeader, { marginBottom: Spacing.sm }]}>
  //               {t('BCSC.Services.FromAccountPrefix')}
  //               <ThemedText variant={'bold'} style={{ color: ColorPalette.brand.primary }}>
  //                 {' '}
  //                 {t('BCSC.Services.FromAccount')}
  //               </ThemedText>
  //             </ThemedText>
  //             <ThemedText>{serviceClient.claims_description}</ThemedText>
  //           </View>

  //           {privacyPolicyUri ? (
  //             <TouchableOpacity
  //               onPress={() => {
  //                 try {
  //                   navigation.navigate(BCSCScreens.MainWebView, {
  //                     url: privacyPolicyUri,
  //                     title: t('BCSC.Services.PrivacyPolicy'),
  //                   })
  //                 } catch (error) {
  //                   logger.error(`Error navigating to the service client privacy policy webview: ${error}`)
  //                 }
  //               }}
  //             >
  //               <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
  //                 <ThemedText style={styles.infoHeader}>{t('BCSC.Services.PrivacyNotice')}</ThemedText>
  //                 <Icon name="open-in-new" size={30} color={ColorPalette.brand.primary} />
  //               </View>
  //             </TouchableOpacity>
  //           ) : null}
  //         </View>

  //         <ThemedText variant={'bold'}>
  //           {t('BCSC.Services.ReportSuspiciousPrefix')} <ThemedText>{t('BCSC.Services.ReportSuspicious')}</ThemedText>
  //         </ThemedText>
  //       </View>
  //       <View style={styles.buttonsContainer}>
  //         <View style={styles.continueButtonContainer}>
  //           <Button
  //             title="Continue"
  //             accessibilityLabel={'Continue'}
  //             testID={testIdWithKey('ServiceLoginContinue')}
  //             buttonType={ButtonType.Primary}
  //             onPress={async () => {
  //               const generateQuickLogin = await getQuickLoginURL(serviceClient)
  //               if (generateQuickLogin.success) {
  //                 Linking.openURL(generateQuickLogin.url)
  //                 return
  //               }
  //               Alert.alert(t('BCSC.Services.LoginErrorTitle'), generateQuickLogin.error)
  //             }}
  //           />
  //         </View>
  //         <Button
  //           title="Cancel"
  //           accessibilityLabel={'Cancel'}
  //           testID={testIdWithKey('ServiceLoginCancel')}
  //           buttonType={ButtonType.Tertiary}
  //           onPress={() => navigation.goBack()}
  //         />
  //       </View>
  //     </ScrollView>
  //   </SafeAreaView>
  // )
}
