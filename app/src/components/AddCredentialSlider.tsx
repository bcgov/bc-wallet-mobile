import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds/build/utils/metadata'
import { CredentialState } from '@credo-ts/core'
import { useCredentialByState } from '@credo-ts/react-hooks'
import {
  useTheme,
  Screens,
  Stacks,
  testIdWithKey,
  testIdForAccessabilityLabel,
  useNetwork,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { hitSlop } from '../constants'
import { BCWalletEventTypes } from '../events/eventTypes'
import { showPersonCredentialSelector } from '../helpers/BCIDHelper'

const AddCredentialSlider: React.FC = () => {
  const { ColorPallet, TextTheme } = useTheme()
  const navigation = useNavigation()
  const { t } = useTranslation()
  const { assertNetworkConnected } = useNetwork()

  const [addCredentialPressed, setAddCredentialPressed] = useState<boolean>(false)
  const [showGetPersonCredential, setShowGetPersonCredential] = useState<boolean>(false)

  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ]

  const styles = StyleSheet.create({
    centeredView: {
      marginTop: 'auto',
      justifyContent: 'flex-end',
    },
    outsideListener: {
      height: '100%',
    },
    modalView: {
      backgroundColor: ColorPallet.grayscale.white,
      borderTopStartRadius: 4,
      borderTopEndRadius: 4,
      shadowColor: '#000',
      padding: 20,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    drawerTitleText: {
      ...TextTheme.normal,
      fontWeight: 'bold',
      marginVertical: 5,
    },
    drawerContentText: {
      ...TextTheme.normal,
    },
    drawerCloseIcon: {
      alignSelf: 'flex-end',
      position: 'absolute',
      zIndex: 10,
      padding: 12,
    },
    drawerRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginVertical: 12,
      marginRight: 20,
    },
    drawerRowItem: {
      color: ColorPallet.brand.primary,
    },
    drawerRowSeparator: {
      borderBottomWidth: 0.25,
      borderBottomColor: ColorPallet.brand.primary,
    },
  })

  const deactivateSlider = useCallback(() => {
    DeviceEventEmitter.emit(BCWalletEventTypes.ADD_CREDENTIAL_PRESSED, false)
  }, [])

  const goToScanScreen = useCallback(() => {
    deactivateSlider()
    if (!assertNetworkConnected()) return
    navigation.getParent()?.navigate(Stacks.ConnectStack, { screen: Screens.Scan })
  }, [])

  const goToPersonCredentialScreen = useCallback(() => {
    deactivateSlider()
    navigation.getParent()?.navigate(Stacks.NotificationStack, {
      screen: Screens.CustomNotification,
    })
  }, [])

  useEffect(() => {
    const credentialDefinitionIDs = credentials.map(
      (c) => c.metadata.data[AnonCredsCredentialMetadataKey].credentialDefinitionId as string
    )

    setShowGetPersonCredential(showPersonCredentialSelector(credentialDefinitionIDs))
  }, [credentials])

  useEffect(() => {
    const handle = DeviceEventEmitter.addListener(BCWalletEventTypes.ADD_CREDENTIAL_PRESSED, (value?: boolean) => {
      const newVal = value === undefined ? !addCredentialPressed : value
      setAddCredentialPressed(newVal)
    })

    return () => {
      handle.remove()
    }
  }, [])

  return (
    <Modal animationType="slide" transparent={true} visible={addCredentialPressed} onRequestClose={deactivateSlider}>
      <TouchableOpacity style={styles.outsideListener} onPress={deactivateSlider} accessible={false} />
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity
            style={styles.drawerCloseIcon}
            testID={testIdWithKey('Close')}
            accessibilityLabel={t('Global.Close')}
            accessibilityRole={'button'}
            onPress={deactivateSlider}
            hitSlop={hitSlop}
          >
            <Icon name="window-close" size={35} style={styles.drawerRowItem}></Icon>
          </TouchableOpacity>

          <Text style={styles.drawerTitleText}>{t('AddCredentialSlider.Title')}</Text>

          {showGetPersonCredential && (
            <TouchableOpacity
              style={styles.drawerRow}
              onPress={goToScanScreen}
              testID={testIdWithKey(testIdForAccessabilityLabel(t('AddCredentialSlider.ScanQRCode')))}
              accessibilityLabel={t('AddCredentialSlider.ScanQRCode')}
            >
              <Icon name="qrcode" size={30} style={styles.drawerRowItem}></Icon>
              <Text style={{ ...styles.drawerRowItem, marginLeft: 5 }}>{t('CredentialDetails.ScanQrCode')}</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.drawerRowSeparator]}></View>
          <TouchableOpacity
            style={styles.drawerRow}
            onPress={goToPersonCredentialScreen}
            testID={testIdWithKey(testIdForAccessabilityLabel(t('BCID.GetDigitalID')))}
            accessibilityLabel={t('BCID.GetDigitalID')}
          >
            <Icon name="credit-card" size={30} style={styles.drawerRowItem}></Icon>
            <Text style={{ ...styles.drawerRowItem, marginLeft: 5 }}>{t('BCID.GetDigitalID')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default AddCredentialSlider
