import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { ControlContainer } from '../../components/ControlContainer'
import { useScannedDriversLicenceViewModel } from './useScannedDriversLicenceViewModel'

type ScannedDriversLicenceProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ScannedDriversLicence>
}

const ScannedDriversLicense = ({ navigation }: ScannedDriversLicenceProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { handleContinueWithLicence, handleScanServicesCard } = useScannedDriversLicenceViewModel(navigation)

  const styles = StyleSheet.create({
    pageHeaderContainer: {
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        title={t('BCSC.ScannedDriversLicence.ContinueWithLicence')}
        buttonType={ButtonType.Primary}
        onPress={handleContinueWithLicence}
        testID={testIdWithKey(TestIds.verify.scannedDriversLicence.continueWithLicence)}
        accessibilityLabel={t('BCSC.ScannedDriversLicence.ContinueWithLicence')}
      />
      <Button
        title={t('BCSC.ScannedDriversLicence.ScanBCSC')}
        buttonType={ButtonType.Secondary}
        onPress={handleScanServicesCard}
        testID={testIdWithKey(TestIds.verify.scannedDriversLicence.scanBcsc)}
        accessibilityLabel={t('BCSC.ScannedDriversLicence.ScanBCSC')}
      />
    </ControlContainer>
  )

  // Unpadded so the ControlContainer reaches the screen edges; the content sets its own padding.
  return (
    <ScreenWrapper padded={false} scrollViewContainerStyle={styles.pageHeaderContainer} controls={controls}>
      <ThemedText variant="headingThree">{t('BCSC.ScannedDriversLicence.Heading')}</ThemedText>
      <ThemedText>{t('BCSC.ScannedDriversLicence.Description')}</ThemedText>
    </ScreenWrapper>
  )
}

export default ScannedDriversLicense
