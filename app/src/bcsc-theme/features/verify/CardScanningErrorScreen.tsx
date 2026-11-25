import { ListButton } from '@/bcsc-theme/components/ListButton'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ICON_SIZE } from '@/constants'
import { TestIds } from '@/test-ids/registry'
import { a11yLabel } from '@/utils/accessibility'
import { Link, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useCardScanningErrorViewModel } from './useCardScanningErrorViewModel'

type CardScanningErrorScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.CardScanningError>
}

const CardScanningErrorScreen = ({ navigation }: CardScanningErrorScreenProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { width } = useWindowDimensions()
  const { handleCheckCard, handleScanAgain, handleEnterManually, handleUseAnotherId } =
    useCardScanningErrorViewModel(navigation)

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

  return (
    <ScreenWrapper scrollViewContainerStyle={styles.pageHeaderContainer}>
      <ThemedText variant="headingThree">{t('BCSC.CardScanningError.Heading')}</ThemedText>
      <ThemedText style={styles.description}>
        {t('BCSC.CardScanningError.Description')}
        <Link linkText={t('BCSC.CardScanningError.CheckCardLink')} onPress={handleCheckCard} />
      </ThemedText>

      <ListButton
        position="only"
        onPress={handleScanAgain}
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
        onPress={handleEnterManually}
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
        onPress={handleUseAnotherId}
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
