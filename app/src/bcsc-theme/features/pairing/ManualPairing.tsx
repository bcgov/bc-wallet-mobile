import { Button, ButtonType, KeyboardView, testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { BCSCRootStackParams, BCSCScreens } from '@bcsc-theme/types/navigators'
import PairingCodeTextInput from './components/PairingCodeTextInput'
import { loginByPairingCode } from '@/api/services/utility.service'

type ManualPairingProps = StackScreenProps<BCSCRootStackParams, BCSCScreens.ManualPairingCode>

const ManualPairing: React.FC<ManualPairingProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | undefined>(undefined)
  const { Spacing, ColorPallet } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {},
  })

  const handleChangeCode = (text: string) => {
    setCode(text)
    setMessage(undefined)
  }

  const onSubmit = async () => {
    if (code.length < 6) {
      setMessage('Pairing code must be six characters long.')
    } else if (!code.length) {
      setMessage('Pairing code cannot be empty.')
    } else {
      try {
        setLoading(true)
        logger.info(`Submitting pairing code: ${code}`)
        const result = await loginByPairingCode(code)
        if (result.success) {
          logger.info('Pairing code submitted successfully.')
          navigation.navigate(BCSCScreens.PairingConfirmation, {
            serviceId: '1',
            serviceName: 'BC Parks Discover Camping',
          })
        } else {
          logger.error(`Failed to submit pairing code with status: ${result.status}`)
          throw new Error('Failed to submit pairing code.')
        }
      } catch (error) {
        logger.error(`Error submitting pairing code: ${error}`)
        setMessage('Failed to submit pairing code.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <KeyboardView>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingOne'}>Enter pairing code</ThemedText>
          <ThemedText>A pairing code will be provided when you log in to a website on another device.</ThemedText>
          <PairingCodeTextInput handleChangeCode={handleChangeCode} />
          <ThemedText variant={'inlineErrorText'}>{message}</ThemedText>
        </View>
        <View style={styles.controlsContainer}>
          <Button
            title={t('Global.Submit')}
            buttonType={ButtonType.Primary}
            testID={testIdWithKey('Submit')}
            accessibilityLabel={t('Global.Submit')}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading && <ActivityIndicator style={{ marginRight: Spacing.sm }} size={20} color={ColorPallet.brand.icon} />}
          </Button>
        </View>
      </View>
    </KeyboardView>
  )
}

export default ManualPairing
