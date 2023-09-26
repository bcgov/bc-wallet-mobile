import AsyncStorage from '@react-native-async-storage/async-storage'
import { Button, ButtonType, useTheme } from 'aries-bifold'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Modal, StyleSheet, Text, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import useTourImageDimensions from '../hooks/tour-image-dimensions'

interface PushNotificationsModalProps {
  title: string
  doneTitle?: string
  doneType?: ButtonType
  doneAccessibilityLabel?: string
  onDone?: () => void
  onHome?: () => void
  doneVisible?: boolean
  homeVisible?: boolean
  testID?: string
  visible?: boolean
}

const PushNotificationsModal: React.FC<PushNotificationsModalProps> = ({ title, onDone, visible }) => {
  const { t } = useTranslation()
  const [modalVisible, setModalVisible] = useState<boolean>(true)
  const { ColorPallet, TextTheme } = useTheme()
  const { imageWidth, imageHeight } = useTourImageDimensions()

  useEffect(() => {
    if (visible !== undefined) {
      setModalVisible(visible)
    }
  }, [visible])

  const styles = StyleSheet.create({
    container: {
      height: '100%',
      backgroundColor: ColorPallet.brand.modalPrimaryBackground,
      padding: 20,
    },
    messageText: {
      marginTop: 30,
    },
    controlsContainer: {
      backgroundColor: ColorPallet.brand.modalPrimaryBackground,
      marginTop: 'auto',
      margin: 20,
    },
    buttonContainer: {
      paddingTop: 10,
    },
  })

  const onNotNow = async () => {
    await AsyncStorage.setItem('userDeniedPushNotifications', 'true')
    setModalVisible(false)
  }

  return (
    <Modal visible={modalVisible} transparent={true}>
      <SafeAreaView style={{ backgroundColor: ColorPallet.brand.modalPrimaryBackground }}>
        <ScrollView style={[styles.container]}>
          <Text style={[TextTheme.modalTitle, { fontWeight: 'bold', textAlign: 'center' }]}>{title}</Text>
          <Image
            source={require('../assets/img/push-notifications.png')}
            resizeMode={'contain'}
            resizeMethod={'resize'}
            style={{
              alignSelf: 'center',
              width: imageWidth,
              height: imageHeight,
            }}
          />
          <Text style={[TextTheme.modalNormal, styles.messageText]}>{t('PushNotifications.HeadingOne')}</Text>
          <Text style={[TextTheme.modalNormal, styles.messageText]}>{t('PushNotifications.HeadingTwo')}</Text>
          <Text style={[TextTheme.modalNormal]}>{'    \u2022 ' + t('PushNotifications.BulletOne')} </Text>
          <Text style={[TextTheme.modalNormal]}>{'    \u2022 ' + t('PushNotifications.BulletTwo')} </Text>
          <Text style={[TextTheme.modalNormal]}>{'    \u2022 ' + t('PushNotifications.BulletThree')} </Text>
          <Text style={[TextTheme.modalNormal]}>{'    \u2022 ' + t('PushNotifications.BulletFour')} </Text>
        </ScrollView>
        <View style={[styles.controlsContainer]}>
          <View style={styles.buttonContainer}>
            <Button
              title={t('PushNotifications.Continue')}
              accessibilityLabel={t('PushNotifications.Continue')}
              onPress={onDone}
              buttonType={ButtonType.ModalPrimary}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title={t('Global.NotNow')}
              accessibilityLabel={t('Global.NotNow')}
              onPress={onNotNow}
              buttonType={ButtonType.ModalSecondary}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

export default PushNotificationsModal
