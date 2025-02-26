import React from 'react'
import { useTheme, Link, Button, ButtonType } from '@hyperledger/aries-bifold-core'
import { useTranslation } from 'react-i18next'
import { Modal, ScrollView, StyleSheet, Text, View, Platform, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TextTheme } from '../theme'

const UpdateModal: React.FC = () => {
  const { t } = useTranslation()
  const { ColorPallet, Assets, TextTheme } = useTheme()
  const credentialInHandDisplayOptions = {
    fill: ColorPallet.notification.infoText,
    height: 130,
    width: 130,
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
    image: {
      marginTop: 20,
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    messageText: {
      textAlign: 'center',
      marginTop: 30,
    },
    controlsContainer: {
      marginTop: 'auto',
      margin: 20,
    },
    delayMessageText: {
      textAlign: 'center',
      marginTop: 20,
    },
    buttonContainer: {
      justifyContent: 'flex-end',
      flex: 1,
    },
  })

  const onPressWhatIsNew = () => {
    console.log('onPressWhatIsNewLink')

    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/us/app/bc-wallet/id1587380443'
        : 'https://play.google.com/store/apps/details?id=ca.bc.gov.BCWallet'

    return Linking.openURL(url)
  }

  return (
    <Modal visible={true} transparent={false} animationType={'none'}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.imageContainer}>
            <Assets.svg.glorb {...credentialInHandDisplayOptions} />
          </View>
          <Text style={[TextTheme.headingTwo, { marginBottom: 24 }]}>{'Update BC Wallet to the latest version'}</Text>
          <Text style={TextTheme.normal}>
            {
              'BC Wallet was updated with new improvements. Update your app now to enjoy the latest features and enhancements.'
            }
          </Text>
          <Link style={{ marginVertical: 24 }} onPress={onPressWhatIsNew} linkText={"Learn what's New"} />
          <View style={styles.buttonContainer}>
            <View style={{ marginBottom: 15 }}>
              <Button
                title={'Update the app'}
                accessibilityLabel={t('Credentials.AddFirstCredential')}
                testID={'Glorb'}
                buttonType={ButtonType.Primary}
                onPress={onPressWhatIsNew}
              />
            </View>
            <Button
              title={'Do this later'}
              accessibilityLabel={t('Credentials.AddFirstCredential')}
              testID={'Glorb'}
              buttonType={ButtonType.Secondary}
              onPress={onPressWhatIsNew}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

export default UpdateModal
