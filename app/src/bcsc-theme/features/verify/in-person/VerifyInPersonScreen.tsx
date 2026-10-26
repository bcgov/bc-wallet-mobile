import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import BulletPointWithText from '@/components/BulletPointWithText'
import { BC_SERVICE_LOCATION_URL } from '@/constants'
import { BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
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
import { Linking, StyleSheet, View } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VerifyInPersonScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyInPerson>
}

const VerifyInPersonScreen = ({ navigation }: VerifyInPersonScreenProps) => {
  const { Spacing, ColorPalette, Buttons } = useTheme()
  const [store] = useStore<BCState>()
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const { token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { ButtonLoading } = useAnimatedComponents()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    // Section headings ("Where to go", "What to bring", etc.) rendered in heading blue.
    sectionHeading: {
      color: ColorPalette.brand.headerText,
    },
    // Confirmation code and completion date rendered in high-contrast black.
    dataValue: {
      fontWeight: 'normal',
      color: ColorPalette.grayscale.black,
    },
    linkButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      flexWrap: 'wrap',
      flexShrink: 1,
    },
  })

  const onPressComplete = async () => {
    try {
      setLoading(true)
      setError(false)

      if (!store.bcscSecure.deviceCode || !store.bcscSecure.userCode) {
        throw new Error(t('BCSC.VerifyIdentity.DeviceCodeError'))
      }

      // checkDeviceCodeStatus already calls updateTokens internally, no need to call it again
      await token.checkDeviceCodeStatus(store.bcscSecure.deviceCode, store.bcscSecure.userCode)

      navigation.navigate(BCSCScreens.VerificationSuccess)
    } catch (e) {
      logger.error(`Error completing device verification: ${e}`)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const controls = (
    <>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        {error && (
          <ThemedText variant={'inlineErrorText'} style={{ marginBottom: Spacing.sm }}>
            {t('BCSC.VerifyIdentity.YouHaveNotBeenVerified')}
          </ThemedText>
        )}
        {store.bcscSecure.cardProcess !== BCSCCardProcess.NonBCSC ? (
          <ThemedText variant={'labelSubtitle'}>
            {t('BCSC.VerifyIdentity.CardSerialNumber', {
              serial: store.bcscSecure.serial ?? 'N/A',
            })}
          </ThemedText>
        ) : null}
      </View>
      <ControlContainer>
        <Button
          buttonType={ButtonType.Primary}
          testID={testIdWithKey(TestIds.verify.verifyInPerson.complete)}
          accessibilityLabel={t('BCSC.VerifyIdentity.Complete')}
          title={t('BCSC.VerifyIdentity.Complete')}
          onPress={onPressComplete}
          disabled={loading}
        >
          {loading && <ButtonLoading />}
        </Button>
      </ControlContainer>
    </>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
    >
      <ThemedText variant={'headingThree'} style={{ textAlign: 'center' }}>
        {t('BCSC.VerifyIdentity.VerifyInPersonTitle')}
      </ThemedText>
      <View style={{ paddingVertical: Spacing.sm }}>
        <Button
          buttonType={ButtonType.Secondary}
          title={''}
          onPress={() => Linking.openURL(BC_SERVICE_LOCATION_URL)}
          accessibilityLabel={t('BCSC.VerifyIdentity.WhereToGoLink')}
          accessibilityHint={t('Global.A11y.OpensInBrowser')}
          testID={testIdWithKey(TestIds.verify.verifyInPerson.serviceBcLink)}
        >
          <View style={styles.linkButtonContent}>
            <ThemedText style={Buttons.secondaryText}>{t('BCSC.VerifyIdentity.WhereToGoLink')}</ThemedText>
            <Icon name="open-in-new" size={24} color={Buttons.secondaryText.color} />
          </View>
        </Button>
      </View>
      <View>
        <ThemedText variant={'bold'} style={styles.sectionHeading}>
          {t('BCSC.VerifyIdentity.WhatToBring')}
        </ThemedText>
        <BulletPointWithText translationKey={'BCSC.VerifyIdentity.ThisDevice'} />
        <BulletPointWithText
          translationKey={
            store.bcscSecure.cardProcess === BCSCCardProcess.NonBCSC
              ? 'BCSC.VerifyIdentity.PiecesOfID'
              : 'BCSC.VerifyIdentity.YourBCServicesCard'
          }
        />
      </View>
      <View>
        <ThemedText variant={'bold'} style={styles.sectionHeading}>
          {t('BCSC.VerifyIdentity.ShowThisConfirmationNumber')}
        </ThemedText>
        <ThemedText
          testID={testIdWithKey(TestIds.verify.verifyInPerson.confirmationCode)}
          variant={'headingTwo'}
          style={[styles.dataValue, { marginBottom: Spacing.md, letterSpacing: 7 }]}
          // A code split across lines reads as two codes; shrink it instead at large OS font sizes
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {/* User codes are 8 digits and are to be formatted as XXXX-XXXX in UI */}
          {`${store.bcscSecure.userCode?.slice(0, 4)}-${store.bcscSecure.userCode?.slice(4, 8)}`}
        </ThemedText>
      </View>
      <View>
        <ThemedText variant={'bold'} style={styles.sectionHeading}>
          {t('BCSC.VerifyIdentity.YouMustCompleteThisBy')}
        </ThemedText>
        <ThemedText variant={'headingTwo'} style={styles.dataValue}>
          {store.bcscSecure.deviceCodeExpiresAt?.toLocaleString(t('BCSC.LocaleStringFormat'), {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </ThemedText>
      </View>
    </ScreenWrapper>
  )
}
export default VerifyInPersonScreen
