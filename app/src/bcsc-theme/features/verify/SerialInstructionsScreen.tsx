import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import SerialHighlightImage from '@assets/img/highlight_serial_barcode.png'

const SERIAL_HIGHLIGHT_IMAGE = Image.resolveAssetSource(SerialHighlightImage).uri

const twoThirds = 0.67

type SerialInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.SerialInstructions>
}

const SerialInstructionsScreen: React.FC<SerialInstructionsScreenProps> = ({
  navigation,
}: SerialInstructionsScreenProps) => {
  const { t } = useTranslation()
  const { ColorPallet, Spacing } = useTheme()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.md,
    },
    controlsContainer: {
      margin: Spacing.md,
      marginTop: 'auto',
      position: 'relative',
    },
    image: {
      width: width - Spacing.md * 2,
      height: (width - Spacing.md * 2) * twoThirds,
      marginBottom: Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Image source={{ uri: SERIAL_HIGHLIGHT_IMAGE }} style={styles.image} resizeMode={'contain'} />
        <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
          {t('Unified.Instructions.Heading')}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.sm }}>{t('Unified.Instructions.Paragraph')}</ThemedText>
      </ScrollView>
      <View style={styles.controlsContainer}>
        <Button
          title={t('Unified.Instructions.ScanBarcode')}
          accessibilityLabel={t('Unified.Instructions.ScanBarcode')}
          testID={testIdWithKey('ScanBarcode')}
          onPress={() => navigation.navigate(BCSCScreens.ScanSerial)}
          buttonType={ButtonType.Primary}
        />
        <View style={{ marginTop: Spacing.md }}>
          <Button
            title={t('Unified.Instructions.EnterManually')}
            accessibilityLabel={t('Unified.Instructions.EnterManually')}
            testID={testIdWithKey('EnterManually')}
            onPress={() => navigation.navigate(BCSCScreens.ManualSerial)}
            buttonType={ButtonType.Secondary}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

export default SerialInstructionsScreen
