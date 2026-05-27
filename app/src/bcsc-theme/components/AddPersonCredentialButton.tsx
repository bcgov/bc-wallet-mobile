import { BCState } from '@/store'
import { ButtonLocation, IconButton, TOKENS, testIdWithKey, useServices, useStore, useTheme } from '@bifold/core'
import { useAgent } from '@bifold/react-hooks'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator } from 'react-native'

import useApi from '../api/hooks/useApi'
import { DidCommOobStrategy } from '../features/qr-core/uri-strategies'
import { BCSCMainStackParams, BCSCScreens } from '../types/navigators'

/**
 * Wallet-tab header "+" button for BCSC.
 *
 * Requests a Person Credential invitation from IAS, then feeds the returned
 * invitation URL through the same DIDComm OOB strategy the QR scanner uses, so
 * the credential is received in-app (the v4 single-app flow). On success it
 * hands off to the shared ConnectionLoading screen.
 */
const AddPersonCredentialButton: React.FC = () => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { agent } = useAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const { personCredential } = useApi()
  const [isLoading, setIsLoading] = useState(false)

  const onPress = useCallback(async () => {
    if (isLoading) {
      return
    }
    setIsLoading(true)
    try {
      const { invitation_url } = await personCredential.createPersonCredential()

      // Reuse the scanner's OOB handling so this path behaves identically to
      // scanning the same invitation. label becomes our contact name on the
      // issuer's side; mirror the scanner's nickname fallback.
      const label = store.bcsc.selectedNickname || 'My Wallet'
      const result = await DidCommOobStrategy.handle(invitation_url, { agent, logger, label })

      if (result.kind === 'connection') {
        navigation.navigate(BCSCScreens.ConnectionLoading, { oobRecordId: result.oobRecordId })
      } else {
        logger.warn(`[AddPersonCredentialButton] unexpected scan result: ${result.kind}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error(`[AddPersonCredentialButton] failed to create person credential: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, personCredential, store.bcsc.selectedNickname, agent, logger, navigation])

  if (isLoading) {
    return (
      <ActivityIndicator color={ColorPalette.brand.primary} testID={testIdWithKey('AddPersonCredentialLoading')} />
    )
  }

  return (
    <IconButton
      buttonLocation={ButtonLocation.Right}
      accessibilityLabel={t('Credentials.AddCredential')}
      testID={testIdWithKey('AddPersonCredential')}
      onPress={onPress}
      icon="plus-circle-outline"
    />
  )
}

export default AddPersonCredentialButton
