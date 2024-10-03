import { testIdWithKey, Button, ButtonType, CredentialListFooterProps } from '@hyperledger/aries-bifold-core'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View, DeviceEventEmitter, StyleSheet } from 'react-native'

import { BCWalletEventTypes } from '../events/eventTypes'

const AddCredentialButton: React.FC<CredentialListFooterProps> = ({ credentialsCount }) => {
  const { t } = useTranslation()

  const activateSlider = useCallback(() => {
    DeviceEventEmitter.emit(BCWalletEventTypes.ADD_CREDENTIAL_PRESSED, true)
  }, [])

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
  })

  return credentialsCount > 0 ? (
    <View style={styles.container}>
      <Button
        title={t('Credentials.AddCredential')}
        buttonType={ButtonType.Secondary}
        testID={testIdWithKey('AddCredential')}
        onPress={activateSlider}
      />
    </View>
  ) : null
}

export default AddCredentialButton
