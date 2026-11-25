import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { RouteProp, useRoute } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { ControlContainer } from '../../components/ControlContainer'

const ScannedDriversLicense = () => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { params } = useRoute<RouteProp<BCSCVerifyStackParams, BCSCScreens.ScannedDriversLicence>>()

  const styles = StyleSheet.create({
    pageHeaderContainer: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
    serialNumber: {
      fontWeight: 'bold',
    },
    continueDescription: {
      marginTop: Spacing.md,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        title={t('BCSC.ScannedDriversLicence.ContinueWithLicence')}
        buttonType={ButtonType.Primary}
        onPress={() => {
          console.log('CONTINUE WITH DRIVERS LICENCE')
        }}
        testID={testIdWithKey(TestIds.verify.scannedDriversLicence.continueWithLicence)}
        accessibilityLabel={t('BCSC.ScannedDriversLicence.ContinueWithLicence')}
      />
      <Button
        title={t('BCSC.ScannedDriversLicence.ScanBCSC')}
        buttonType={ButtonType.Secondary}
        onPress={() => {
          console.log('SCAN BC SERVICES CARD')
        }}
        testID={testIdWithKey(TestIds.verify.scannedDriversLicence.scanBcsc)}
        accessibilityLabel={t('BCSC.ScannedDriversLicence.ScanBCSC')}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper scrollViewContainerStyle={styles.pageHeaderContainer} controls={controls}>
      <ThemedText variant="headingThree">{t('BCSC.ScannedDriversLicence.Heading')}</ThemedText>
      <ThemedText style={styles.serialNumber}>
        {t('BCSC.ScannedDriversLicence.SerialNumber', { serial: params.serial })}
      </ThemedText>
      <ThemedText>{t('BCSC.ScannedDriversLicence.Description1')}</ThemedText>
      <ThemedText style={styles.continueDescription}>{t('BCSC.ScannedDriversLicence.Description2')}</ThemedText>
    </ScreenWrapper>
  )
}

export default ScannedDriversLicense
