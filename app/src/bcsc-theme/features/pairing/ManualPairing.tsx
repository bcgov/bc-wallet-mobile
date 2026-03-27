import useApi from '@/bcsc-theme/api/hooks/useApi'
import CodeInput from '@/bcsc-theme/components/CodeInput'
import { PAIRING_CODE_LENGTH } from '@/constants'
import { BCSCMainStackParams, BCSCScreens } from '@bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useTheme,
} from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ManualPairingProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.ManualPairingCode>

const ManualPairing: React.FC<ManualPairingProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { ButtonLoading } = useAnimatedComponents()
  const { pairing } = useApi()

  const handleChangeCode = useCallback((text: string) => {
    // strip non-alphanumeric characters and convert to uppercase
    setCode(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
    setError(null)
  }, [])

  const onSubmit = async () => {
    if (!code.length) {
      setError(t('BCSC.ManualPairing.EmptyPairingCodeMessage'))
    } else if (code.length < PAIRING_CODE_LENGTH) {
      setError(t('BCSC.ManualPairing.InvalidPairingCodeMessage'))
    } else {
      try {
        setLoading(true)
        logger.info(`Submitting pairing code: ${code}`)
        const serviceClient = await pairing.loginByPairingCode(code)

        logger.info('Pairing code submitted successfully.')

        navigation.navigate(BCSCScreens.PairingConfirmation, {
          serviceId: serviceClient.client_ref_id,
          serviceName: serviceClient.client_name,
        })
      } catch (error) {
        logger.error(`Error submitting pairing code: ${error}`)
        setError(t('BCSC.ManualPairing.FailedToSubmitPairingCodeMessage'))
      } finally {
        setLoading(false)
      }
    }
  }

  const controls = (
    <Button
      title={t('Global.Submit')}
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('Submit')}
      accessibilityLabel={t('Global.Submit')}
      onPress={onSubmit}
      disabled={loading}
    >
      {loading && <ButtonLoading />}
    </Button>
  )

  return (
    <ScreenWrapper keyboardActive controls={controls}>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.ManualPairing.EnterPairingCodeTitle')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.ManualPairing.EnterPairingCodeMessage')}</ThemedText>
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
    </ScreenWrapper>
  )
}

export default ManualPairing
