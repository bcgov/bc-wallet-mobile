import { useTheme, testIdWithKey } from 'aries-bifold'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, DeviceEventEmitter } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { BCWalletEventTypes } from '../events/eventTypes'

const AddCredentialButton: React.FC = () => {
  const { t } = useTranslation()
  const { ColorPallet } = useTheme()

  const activateSlider = useCallback(() => {
    DeviceEventEmitter.emit(BCWalletEventTypes.ADD_CREDENTIAL_PRESSED, true)
  }, [])

  const styles = StyleSheet.create({
    button: {
      paddingHorizontal: 16,
    },
  })
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={t('Credentials.AddCredential')}
      testID={testIdWithKey('AddCredential')}
      style={styles.button}
      onPress={activateSlider}
    >
      <Icon name="plus-circle-outline" size={24} color={ColorPallet.grayscale.white}></Icon>
    </TouchableOpacity>
  )
}

export default AddCredentialButton
