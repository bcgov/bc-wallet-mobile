import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

const TransferSuccessScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
      padding: Spacing.md,
    },
  })

  const controls = (
    <Button
      testID={testIdWithKey(t('BCSC.TransferSuccess.ButtonText'))}
      accessibilityLabel={t('BCSC.TransferSuccess.ButtonText')}
      title={t('BCSC.TransferSuccess.ButtonText')}
      buttonType={ButtonType.Primary}
      onPress={() => navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })}
    />
  )

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.pageContainer}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
      scrollViewContainerStyle={styles.contentContainer}
    >
      <StatusDetails
        title={t('BCSC.TransferSuccess.Title')}
        description={t('BCSC.TransferSuccess.Description')}
        extraText={t('BCSC.TransferSuccess.ExtraText')}
      />
    </ScreenWrapper>
  )
}
export default TransferSuccessScreen
