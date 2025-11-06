import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'

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
          <ThemedText variant={'headingThree'}>{t('Unified.TransferQRInformation.Title')}</ThemedText>
          <ThemedText>{t('Unified.TransferQRInformation.Instructions')}</ThemedText>
          <ThemedText variant={'bold'}>{t('Unified.TransferQRInformation.Warning')}</ThemedText>
        </View>

        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            title={t('Unified.TransferQRInformation.GetQRCode')}
            onPress={() => {
              navigation.navigate(BCSCScreens.TransferAccountQRDisplay)
            }}
          />
          <Button
            buttonType={ButtonType.Secondary}
            title={t('Unified.TransferQRInformation.LearnMore')}
            onPress={() => {
              // TODO: (Alfred) BCSC opens a web page inside the app, it doesn't open the page in the mobile browser
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransferQRInformationScreen
