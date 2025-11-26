import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TransferQRInformationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const styles = StyleSheet.create({
    scrollView: {
      flex: 1,
      justifyContent: 'space-between',
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
      gap: Spacing.md,
    },
    controlsContainer: {
      gap: Spacing.md,
    },
  })
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'}>{t('BCSC.TransferQRInformation.Title')}</ThemedText>
          <ThemedText>{t('BCSC.TransferQRInformation.Instructions')}</ThemedText>
          <ThemedText variant={'bold'}>{t('BCSC.TransferQRInformation.Warning')}</ThemedText>
        </View>

        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            title={t('BCSC.TransferQRInformation.GetQRCode')}
            onPress={() => {
              navigation.navigate(BCSCScreens.TransferAccountQRDisplay)
            }}
            testID="GetQRCodeButton"
          />
          <Button
            buttonType={ButtonType.Secondary}
            title={t('BCSC.TransferQRInformation.LearnMore')}
            onPress={() => {
              navigation.navigate(BCSCScreens.MainWebView, {
                url: HelpCentreUrl.QUICK_SETUP_OF_ADDITIONAL_DEVICES,
                title: t('HelpCentre.Title'),
              })
            }}
            testID="LearnMoreButton"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransferQRInformationScreen
