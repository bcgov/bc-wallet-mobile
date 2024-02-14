import { testIdWithKey, HeaderButton, ButtonLocation } from '@hyperledger/aries-bifold-core'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter } from 'react-native'

import { BCWalletEventTypes } from '../events/eventTypes'

const AddCredentialButton: React.FC = () => {
  const { t } = useTranslation()

  const activateSlider = useCallback(() => {
    DeviceEventEmitter.emit(BCWalletEventTypes.ADD_CREDENTIAL_PRESSED, true)
  }, [])

  return (
    <HeaderButton
      buttonLocation={ButtonLocation.Right}
      accessibilityLabel={t('Credentials.AddCredential')}
      testID={testIdWithKey('AddCredential')}
      onPress={activateSlider}
      icon="plus-circle-outline"
    />
  )
}

export default AddCredentialButton
