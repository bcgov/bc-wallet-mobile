import { CredentialMetadataKeys, CredentialState } from '@aries-framework/core'
import { useCredentialByState } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/core'
import { useTheme, Screens, Stacks } from 'aries-bifold'
import React, { useEffect, useState, useCallback } from 'react'
import { DeviceEventEmitter, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { BCWalletEventTypes } from '../events/eventTypes'
import { showBCIDSelector } from '../helpers/BCIDHelper'

const AddCredentialSlider: React.FC = () => {
  const { ColorPallet, TextTheme } = useTheme()
  const navigation = useNavigation()

  const [addCredentialPressed, setAddCredentialPressed] = useState<boolean>(false)
  const [showGetFoundationCredential, setShowGetFoundationCredential] = useState<boolean>(false)

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
      borderTopStartRadius: 20,
      borderTopEndRadius: 20,
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
      textAlign: 'center',
      marginVertical: 10,
    },
    drawerContentText: {
      ...TextTheme.normal,
    },
    drawerRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginVertical: 12,
    },
    drawerRowItem: {
      color: ColorPallet.grayscale.black,
    },
  })

  const deactivateSlider = useCallback(() => {
    DeviceEventEmitter.emit(BCWalletEventTypes.ADD_CREDENTIAL_PRESSED, false)
  }, [])

  const goToScanScreen = useCallback(() => {
    deactivateSlider()
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
      (c) => c.metadata.data[CredentialMetadataKeys.IndyCredential].credentialDefinitionId as string
    )

    setShowGetFoundationCredential(showBCIDSelector(credentialDefinitionIDs, true))
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
      <TouchableOpacity style={styles.outsideListener} onPress={deactivateSlider} />
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity onPress={deactivateSlider}>
            <Icon name="window-close" size={35} style={styles.drawerRowItem}></Icon>
          </TouchableOpacity>
          <Text style={styles.drawerTitleText}>Choose</Text>
          {showGetFoundationCredential && (
            <TouchableOpacity style={styles.drawerRow} onPress={goToPersonCredentialScreen}>
              <Icon name="credit-card" size={30} style={styles.drawerRowItem}></Icon>
              <Text style={{ ...styles.drawerRowItem, marginLeft: 5 }}>Get your Person credential</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.drawerRow} onPress={goToScanScreen}>
            <Icon name="qrcode" size={30} style={styles.drawerRowItem}></Icon>
            <Text style={{ ...styles.drawerRowItem, marginLeft: 5 }}>Scan a QR code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default AddCredentialSlider
