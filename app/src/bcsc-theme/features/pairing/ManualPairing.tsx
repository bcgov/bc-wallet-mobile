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
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCMainStackParams, BCSCScreens } from '@bcsc-theme/types/navigators'
import PairingCodeTextInput from './components/PairingCodeTextInput'

type ManualPairingProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.ManualPairingCode>

const ManualPairing: React.FC<ManualPairingProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | undefined>(undefined)
  const { Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { ButtonLoading } = useAnimatedComponents()
  const { pairing } = useApi()

  const handleChangeCode = (text: string) => {
    setCode(text)
    setMessage(undefined)
  }

  const onSubmit = async () => {
    if (code.length < 6) {
      setMessage(t('BCSC.ManualPairing.InvalidPairingCodeMessage'))
    } else if (!code.length) {
      setMessage(t('BCSC.ManualPairing.EmptyPairingCodeMessage'))
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
        setMessage(t('BCSC.ManualPairing.FailedToSubmitPairingCodeMessage'))
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
      <PairingCodeTextInput handleChangeCode={handleChangeCode} />
      <ThemedText variant={'inlineErrorText'}>{message}</ThemedText>
    </ScreenWrapper>
  )
}

export default ManualPairing
