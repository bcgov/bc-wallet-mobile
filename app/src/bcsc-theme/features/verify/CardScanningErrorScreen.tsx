import { ListButton } from '@/bcsc-theme/components/ListButton'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { popToThenNavigate } from '@/bcsc-theme/utils/pop-to-then-navigate'
import { HelpCentreUrl, ICON_SIZE } from '@/constants'
import { BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { a11yLabel } from '@/utils/accessibility'
import { Link, ScreenWrapper, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialIcons'

type CardScanningErrorScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.CardScanningError>
}

const CardScanningErrorScreen = ({ navigation }: CardScanningErrorScreenProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { width } = useWindowDimensions()
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateCardProcess, deleteScannedCardData } = useSecureActions()

  const styles = StyleSheet.create({
    description: {},
    pageHeaderContainer: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
    image: {
      width: width - Spacing.md * 6,
      height: (width - Spacing.md * 6) * 0.67,
      padding: Spacing.lg,
      alignSelf: 'center',
      marginBottom: Spacing.lg,
    },
    listButtonContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    listButtonTitle: {
      flex: 1,
      color: ColorPalette.brand.headerText,
      fontWeight: 'bold',
    },
  })

  const learnAboutServicesCard = () => {
    navigation.navigate(BCSCScreens.VerifyWebView, {
      title: t('BCSC.Screens.HelpCentre'),
      url: HelpCentreUrl.HELP_CHECK_BCSC,
    })
  }

  // Sets the user down the non BCSC card flow
  const tryAnotherCard = useCallback(async () => {
    logger.info('[CardScanningError] User chose to try another card, entering the non-BCSC flow')
    await updateCardProcess(BCSCCardProcess.NonBCSC)
    if (store.bcscSecure.birthdate || store.bcscSecure.serial) {
      await deleteScannedCardData()
    }
    // Back from the non-BCSC flow returns to IdentitySelection, not the scanner.
    popToThenNavigate(navigation, BCSCScreens.IdentitySelection, BCSCScreens.DualIdentificationRequired)
  }, [
    logger,
    navigation,
    updateCardProcess,
    deleteScannedCardData,
    store.bcscSecure.birthdate,
    store.bcscSecure.serial,
  ])

  return (
    <ScreenWrapper scrollViewContainerStyle={styles.pageHeaderContainer}>
      <ThemedText variant="headingThree">{t('BCSC.CardScanningError.Heading')}</ThemedText>
      <ThemedText style={styles.description}>
        {t('BCSC.CardScanningError.Description')}
        <Link linkText={t('BCSC.CardScanningError.CheckCardLink')} onPress={learnAboutServicesCard} />
      </ThemedText>

      <ListButton
        position="only"
        onPress={() => {
          navigation.goBack()
        }}
        accessibilityLabel={a11yLabel(t('BCSC.CardScanningError.ScanAgain'))}
        testID={testIdWithKey(TestIds.verify.cardScanningError.scanAgain)}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{t('BCSC.CardScanningError.ScanAgain')}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
      <ListButton
        position="only"
        onPress={() => {
          navigation.replace(BCSCScreens.ManualSerial)
        }}
        accessibilityLabel={a11yLabel(t('BCSC.CardScanningError.EnterManually'))}
        testID={testIdWithKey(TestIds.verify.cardScanningError.enterManually)}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{t('BCSC.CardScanningError.EnterManually')}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
      <ThemedText style={{ marginTop: Spacing.lg }}>{t('BCSC.CardScanningError.ProblemsContinue')}</ThemedText>
      <ListButton
        position="only"
        onPress={tryAnotherCard}
        accessibilityLabel={a11yLabel(t('BCSC.CardScanningError.UseAnotherID'))}
        testID={testIdWithKey(TestIds.verify.cardScanningError.tryAnotherCard)}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{t('BCSC.CardScanningError.UseAnotherID')}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
    </ScreenWrapper>
  )
}

export default CardScanningErrorScreen
