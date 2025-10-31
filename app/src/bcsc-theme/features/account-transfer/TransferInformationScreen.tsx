import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Spacing } from '@/bcwallet-theme/theme'
import TwoPhones from '@assets/img/transfer-account-two-phones.png'
import { Button, ButtonType, ThemedText } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TWO_PHONES = Image.resolveAssetSource(TwoPhones)

const TransferInformationScreen: React.FC = () => {
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCVerifyIdentityStackParams>>()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
    },
    scrollViewContentContainer: {
      flexGrow: 1,
      justifyContent: 'space-between',
      flexDirection: 'column',
    },
    contentContainer: {
      gap: Spacing.md,
    },
    controlsContainer: {},
  })
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView style={{ flex: 1, padding: Spacing.md }} contentContainerStyle={styles.scrollViewContentContainer}>
        <View style={styles.contentContainer}>
          <Image source={TWO_PHONES} style={{ height: 300, width: 'auto' }} resizeMode={'contain'} />
          <ThemedText variant={'headingThree'}>{t('Unified.TransferInformation.Title')}</ThemedText>
          <ThemedText>{t('Unified.TransferInformation.Instructions')}</ThemedText>
        </View>
        <View style={styles.controlsContainer}>
          <Button
            title={t('Unified.TransferInformation.TransferAccount')}
            buttonType={ButtonType.Primary}
            onPress={() => {
              navigation.navigate(BCSCScreens.TransferAccountInstructions)
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransferInformationScreen
