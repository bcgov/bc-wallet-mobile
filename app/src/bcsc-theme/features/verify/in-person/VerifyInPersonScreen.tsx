import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BC_SERVICE_LOCATION_URL } from '@/constants'
import { BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  Link,
  ScreenWrapper,
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
import { StyleSheet, View } from 'react-native'

type VerifyInPersonScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyInPerson>
}

const VerifyInPersonScreen = ({ navigation }: VerifyInPersonScreenProps) => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { updateTokens } = useSecureActions()
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const { token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { ButtonLoading } = useAnimatedComponents()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
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

      if (!store.bcscSecure.deviceCode || !store.bcscSecure.userCode) {
        throw new Error(t('BCSC.VerifyIdentity.DeviceCodeError'))
      }

      const { refresh_token } = await token.checkDeviceCodeStatus(
        store.bcscSecure.deviceCode,
        store.bcscSecure.userCode
      )
      if (refresh_token) {
        await updateTokens({ refreshToken: refresh_token })

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

  const controls = (
    <>
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
      <ThemedText variant={'labelSubtitle'} style={{ textAlign: 'center' }}>
        {t('BCSC.VerifyIdentity.CardSerialNumber', {
          serial: store.bcscSecure.serial ?? store.bcscSecure.additionalEvidenceData[0]?.documentNumber ?? 'N/A',
        })}
      </ThemedText>
    </>
  )

  return (
    <ScreenWrapper controls={controls}>
      <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.VerifyIdentity.VerifyInPersonTitle')}
      </ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.VerifyIdentity.WhereToGo')}</ThemedText>
      <Link
        linkText={t('BCSC.VerifyIdentity.WhereToGoLink')}
        testID={testIdWithKey('ServiceBCLink')}
        onPress={() => {
          navigation.navigate(BCSCScreens.VerifyWebView, {
            title: t('BCSC.Screens.HelpCentre'),
            url: BC_SERVICE_LOCATION_URL,
          })
        }}
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
        {/* User codes are 8 digits and are to be formatted as XXXX-XXXX in UI */}
        {`${store.bcscSecure.userCode?.slice(0, 4)}-${store.bcscSecure.userCode?.slice(4, 8)}`}
      </ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.VerifyIdentity.YouMustCompleteThisBy')}</ThemedText>
      <ThemedText variant={'headingTwo'} style={{ fontWeight: 'normal' }}>
        {store.bcscSecure.deviceCodeExpiresAt?.toLocaleString(t('BCSC.LocaleStringFormat'), {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </ThemedText>
    </ScreenWrapper>
  )
}
export default VerifyInPersonScreen
