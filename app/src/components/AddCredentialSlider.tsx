import React, { ReducerAction, useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/core'

import { useTheme, useStore, Screens, Stacks } from 'aries-bifold'
import { BCState, BCDispatchAction } from '../store'
import { useAgent, useCredentialByState } from '@aries-framework/react-hooks'
import { showBCIDSelector, startFlow } from '../helpers/BCIDHelper'
import { CredentialMetadataKeys, CredentialState } from '@aries-framework/core'
import LoadingIcon from './LoadingIcon'

const AddCredentialSlider: React.FC = () => {
  const { ColorPallet, TextTheme } = useTheme()
  const { agent } = useAgent()
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [showGetFoundationCredential, setShowGetFoundationCredential] = useState<boolean>(false)
  const [workflowInFlight, setWorkflowInFlight] = useState<boolean>(false)
  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ]
  const navigation = useNavigation()
  const [canUseLSBCredential] = useState<boolean>(true)

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
    dispatch({
      type: BCDispatchAction.ADD_CREDENTIAL_PRESSED,
      payload: [false],
    })
  }, [])

  const goToScanScreen = useCallback(() => {
    deactivateSlider()
    navigation.getParent()?.navigate(Stacks.ConnectStack, { screen: Screens.Scan })
  }, [])

  const onBCIDPress = useCallback(() => {
    setWorkflowInFlight(true)
    startFlow(agent!, store, dispatch as React.Dispatch<ReducerAction<any>>, setWorkflowInFlight, t)
  }, [store])

  useEffect(() => {
    const credentialDefinitionIDs = credentials.map(
      (c) => c.metadata.data[CredentialMetadataKeys.IndyCredential].credentialDefinitionId as string
    )

    setShowGetFoundationCredential(showBCIDSelector(credentialDefinitionIDs, canUseLSBCredential))
  }, [credentials, canUseLSBCredential])

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={store.addCredential.addCredentialPressed}
        onRequestClose={deactivateSlider}
      >
        <TouchableOpacity style={styles.outsideListener} onPress={deactivateSlider} />
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TouchableOpacity onPress={deactivateSlider}>
              <Icon name="window-close" size={35} style={styles.drawerRowItem}></Icon>
            </TouchableOpacity>
            <Text style={styles.drawerTitleText}>Choose</Text>
            {showGetFoundationCredential && (
              <TouchableOpacity style={styles.drawerRow} disabled={workflowInFlight} onPress={onBCIDPress}>
                {workflowInFlight ? (
                  <LoadingIcon size={30} color={styles.drawerRowItem.color} active={workflowInFlight} />
                ) : (
                  <Icon name="credit-card" size={30} style={styles.drawerRowItem}></Icon>
                )}

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
    </View>
  )
}

export default AddCredentialSlider
