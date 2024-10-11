import { Screens, Stacks, useTheme } from '@hyperledger/aries-bifold-core'
import { ConnectStackParams } from '@hyperledger/aries-bifold-core/App/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'

import HomeImg from '../assets/img/HomeImg.svg'

import HeaderText from './HeaderText'

const HomeHeader = () => {
  const { t } = useTranslation()
  const { ColorPallet } = useTheme()
  const { navigate } = useNavigation<StackNavigationProp<ConnectStackParams>>()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
      paddingTop: 24,
      paddingHorizontal: 16,
    },
    ScanQrCodeContainer: {
      marginVertical: 16,
      height: 250,
      width: '100%',
      borderRadius: 10,
      shadowColor: ColorPallet.grayscale.darkGrey,
      shadowOffset: {
        width: 6,
        height: 6,
      },
      elevation: 6,
      shadowOpacity: 0.6,
      shadowRadius: 10,
    },
    ScanQrCodeInnerContainer: {
      borderRadius: 10,
      overflow: 'hidden',
    },
    imgContainer: {
      height: 170,
      width: '100%',
      backgroundColor: ColorPallet.brand.secondary,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    ScanText: {
      color: ColorPallet.brand.primary,
      fontWeight: '600',
      fontSize: 16,
    },
    underImageTextContainer: {
      height: 80,
      width: '100%',
      backgroundColor: ColorPallet.brand.primaryBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activiteTitleContainer: {
      paddingTop: 16,
      flexDirection: 'row',
    },
    activiteTitle: {
      color: ColorPallet.notification.infoText,
      fontSize: 19,
      fontWeight: '700',
    },
  })

  return (
    <View style={styles.container}>
      <HeaderText title={t('Home.Welcome')} />
      <View style={styles.ScanQrCodeContainer}>
        <TouchableWithoutFeedback
          onPress={() => navigate(Stacks.ConnectStack as never, { screen: Screens.Scan } as never)}
        >
          <View style={styles.ScanQrCodeInnerContainer}>
            <View style={styles.imgContainer}>
              <HomeImg />
            </View>
            <View style={styles.underImageTextContainer}>
              <Text style={styles.ScanText}>{t('Home.ScanQrCode')}</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
      <View style={styles.activiteTitleContainer}>
        <Text style={styles.activiteTitle}>{t('Home.NotificationTitle')}</Text>
      </View>
    </View>
  )
}

export default HomeHeader
