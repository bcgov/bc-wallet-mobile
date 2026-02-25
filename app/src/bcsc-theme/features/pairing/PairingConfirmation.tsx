import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import ArrowUp from '@assets/img/arrowup.svg'
import ServiceBookmarkButton from './components/ServiceBookmarkButton'

type ManualPairingProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.PairingConfirmation>

// TODO: remove — hard-coded for debugging on Android
const isIOS = true // Platform.OS === 'ios'

const ManualPairing: React.FC<ManualPairingProps> = ({ navigation, route }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { serviceName, serviceId } = route.params

  const onClose = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab }],
      })
    )
  }

  const controls = !isIOS ? (
    <Button
      title={t('Global.Close')}
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('Close')}
      accessibilityLabel={t('Global.Close')}
      onPress={onClose}
    />
  ) : undefined

  return (
    <ScreenWrapper controls={controls}>
      {isIOS && (
        <ArrowUp height={80} width={80} fill={ColorPalette.brand.primary} style={{ marginTop: -Spacing.md, marginBottom: Spacing.md }} />
      )}
      <ThemedText variant={'headingThree'}>{t('BCSC.ManualPairing.CompletionTitle')}</ThemedText>
      {isIOS && (
        <ThemedText style={{ marginTop: Spacing.sm }}>
          {t('BCSC.ManualPairing.CompletionSubtitle')}
        </ThemedText>
      )}
      <ThemedText style={{ marginVertical: Spacing.md, color: ColorPalette.brand.primary }}>
        {t('BCSC.ManualPairing.CompletionDescription', { serviceName })}
      </ThemedText>
      <ServiceBookmarkButton serviceId={serviceId} serviceName={serviceName} />
    </ScreenWrapper>
  )
}

export default ManualPairing
