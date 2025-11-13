import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  Link,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type VerifyInPersonScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyInPerson>
}

const VerifyInPersonScreen = ({ navigation }: VerifyInPersonScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const { token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { ButtonLoading } = useAnimatedComponents()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
    bulletContainer: {
      flexDirection: 'row',
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const onPressComplete = async () => {
    try {
      setLoading(true)
      setError(false)

      if (!store.bcsc.deviceCode || !store.bcsc.userCode) {
        throw new Error(t('BCSC.VerifyIdentity.DeviceCodeError'))
      }

      const { refresh_token } = await token.checkDeviceCodeStatus(store.bcsc.deviceCode, store.bcsc.userCode)
      if (refresh_token) {
        dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [refresh_token] })

        navigation.navigate(BCSCScreens.VerificationSuccess)
      } else {
        setError(true)
        logger.error('Device verification failed, no refresh token received.')
      }
    } catch (e) {
      logger.error(`Error completing device verification: ${e}`)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.contentContainer}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
          {t('BCSC.VerifyIdentity.VerifyInPersonTitle')}
        </ThemedText>
        <ThemedText variant={'bold'}>{t('BCSC.VerifyIdentity.WhereToGo')}</ThemedText>
        <Link
          linkText={t('BCSC.VerifyIdentity.WhereToGoLink')}
          testID={testIdWithKey('ServiceBCLink')}
          onPress={() => null}
          style={{ marginBottom: Spacing.md }}
        />
        <ThemedText variant={'bold'}>{t('BCSC.VerifyIdentity.WhatToBring')}</ThemedText>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{t('BCSC.VerifyIdentity.ThisDevice')}</ThemedText>
        </View>
        <View style={[styles.bulletContainer, { marginBottom: Spacing.lg }]}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{t('BCSC.VerifyIdentity.YourBCServicesCard')}</ThemedText>
        </View>
        <ThemedText variant={'bold'}>{t('BCSC.VerifyIdentity.ShowThisConfirmationNumber')}</ThemedText>
        <ThemedText variant={'headingTwo'} style={{ fontWeight: 'normal', marginBottom: Spacing.xl, letterSpacing: 7 }}>
          {`${store.bcsc.userCode?.slice(0, 4)}-${store.bcsc.userCode?.slice(4, 8)}`}
        </ThemedText>
        <ThemedText variant={'bold'}>{t('BCSC.VerifyIdentity.YouMustCompleteThisBy')}</ThemedText>
        <ThemedText variant={'headingTwo'} style={{ fontWeight: 'normal' }}>
          {store.bcsc.deviceCodeExpiresAt?.toLocaleString(t('BCSC.LocaleStringFormat'), {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </ThemedText>
      </ScrollView>
      <View style={styles.controlsContainer}>
        <View style={{ marginBottom: Spacing.md }}>
          {error && (
            <ThemedText variant={'inlineErrorText'} style={{ marginBottom: Spacing.sm }}>
              {t('BCSC.VerifyIdentity.YouHaveNotBeenVerified')}
            </ThemedText>
          )}
          <Button
            buttonType={ButtonType.Primary}
            testID={testIdWithKey('Complete')}
            accessibilityLabel={t('BCSC.VerifyIdentity.Complete')}
            title={t('BCSC.VerifyIdentity.Complete')}
            onPress={onPressComplete}
            disabled={loading}
          >
            {loading && <ButtonLoading />}
          </Button>
        </View>
        <ThemedText variant={'labelSubtitle'} style={{ textAlign: 'center' }}>
          {t('BCSC.VerifyIdentity.CardSerialNumber', {
            serial: store.bcsc.serial ?? store.bcsc.additionalEvidenceData[0]?.documentNumber ?? 'N/A',
          })}
        </ThemedText>
      </View>
    </SafeAreaView>
  )
}
export default VerifyInPersonScreen
