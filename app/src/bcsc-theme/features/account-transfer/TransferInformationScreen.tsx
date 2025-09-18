import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import TwoPhones from '@assets/img/transfer-account-two-phones.png'
import { Button, ButtonType, ThemedText } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { Image, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TWO_PHONES = Image.resolveAssetSource(TwoPhones)

const TransferInformationScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCRootStackParams>>()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
    },
    text: {
      fontSize: 18,
      color: '#333',
    },
  })

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView>
        <Image source={TWO_PHONES} style={{ height: 300, width: 'auto', marginTop: 16 }} resizeMode={'contain'} />
        <ThemedText variant="headerTitle">Have this app on another device?</ThemedText>
        <ThemedText>
          You can transfer your account to that other device. No need to provide ID or verify your identity again.
        </ThemedText>
        <Button
          title="Transfer Account"
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.TransferAccountQRDisplay)
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransferInformationScreen
