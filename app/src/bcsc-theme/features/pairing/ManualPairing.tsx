import useApi from '@/bcsc-theme/api/hooks/useApi'
import CodeInput from '@/bcsc-theme/components/CodeInput'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { QRCoreTabParams } from '@/bcsc-theme/navigators/QRCoreStack'
import { PAIRING_CODE_LENGTH } from '@/constants'
import { BCSCMainStackParams, BCSCScreens } from '@bcsc-theme/types/navigators'
import { ScreenWrapper, testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

const ManualPairing: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const tabNavigation = useNavigation<BottomTabNavigationProp<QRCoreTabParams, 'PairingCode'>>()
  const route = useRoute<RouteProp<QRCoreTabParams, 'PairingCode'>>()
  const { t } = useTranslation()
  const [code, setCode] = useState(route.params?.pairingCode ?? '')
  const [error, setError] = useState<string | null>(null)
  const { Spacing, ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { pairing } = useApi()
  const loadingScreen = useLoadingScreen()

  const onSubmit = useCallback(
    async (pairingCode: string) => {
      const stopLoading = loadingScreen.startLoading()
      try {
        logger.info('Submitting pairing code.')
        const serviceClient = await pairing.loginByPairingCode(pairingCode)

        logger.info('Pairing code submitted successfully.')

        navigation.navigate(BCSCScreens.PairingConfirmation, {
          serviceId: serviceClient.client_ref_id,
          serviceName: serviceClient.client_name,
        })
      } catch (error) {
        logger.error(`Error submitting pairing code: ${error}`)
        setError(t('BCSC.ManualPairing.FailedToSubmitPairingCodeMessage'))
      } finally {
        stopLoading()
      }
    },
    [loadingScreen, logger, navigation, pairing, t]
  )

  // QRCoreStack keeps tabs mounted (unmountOnBlur: false), so a pre-populated
  // pairingCode param must be consumed-and-cleared or it would re-fire on every
  // focus. Tab navigator handles setParams; cast off the type-system mismatch
  // since useNavigation typing is split between parent stack and sibling tab.
  useEffect(() => {
    const pre = route.params?.pairingCode
    if (pre && pre.length === PAIRING_CODE_LENGTH) {
      setCode(pre)
      onSubmit(pre)
      tabNavigation.setParams({ pairingCode: undefined })
    }
  }, [route.params?.pairingCode, onSubmit, tabNavigation])

  const handleChangeCode = useCallback(
    (text: string) => {
      // strip non-alphanumeric characters and convert to uppercase
      const cleanCode = text.replaceAll(/[^a-zA-Z0-9]/g, '').toUpperCase()
      setCode(cleanCode)
      setError(null)

      // Auto submit
      if (cleanCode.length === PAIRING_CODE_LENGTH) {
        onSubmit(cleanCode)
      }
    },
    [onSubmit]
  )

  const styles = StyleSheet.create({
    lineBreak: {
      height: 4,
      marginTop: Spacing.md,
      marginHorizontal: Spacing.md,
    },
  })

  return (
    <ScreenWrapper keyboardActive>
      <ThemedText
        variant={'headingTwo'}
        style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.md, alignSelf: 'center' }}
      >
        {t('BCSC.ManualPairing.EnterPairingCodeTitle')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md, marginHorizontal: Spacing.md, alignSelf: 'center' }}>
        {t('BCSC.ManualPairing.EnterPairingCodeMessage')}
      </ThemedText>
      <CodeInput
        value={code}
        onChange={handleChangeCode}
        error={error}
        onErrorClear={() => setError(null)}
        separator
        textInputProps={{
          autoCapitalize: 'characters',
          autoComplete: 'off',
          autoCorrect: false,
          testID: testIdWithKey('ManualPairingCodeInput'),
          accessibilityLabel: 'Pairing-Code-Input',
        }}
      />
      <View style={[styles.lineBreak, { backgroundColor: ColorPalette.brand.highlight }]} />
    </ScreenWrapper>
  )
}

export default ManualPairing
