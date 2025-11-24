import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import SerialHighlightImage from '@assets/img/highlight_serial_barcode.png'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'

const SERIAL_HIGHLIGHT_IMAGE = Image.resolveAssetSource(SerialHighlightImage).uri

const twoThirds = 0.67

type SerialInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SerialInstructions>
}

const SerialInstructionsScreen: React.FC<SerialInstructionsScreenProps> = ({
  navigation,
}: SerialInstructionsScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollView: {
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

  const controls = (
    <>
      <Button
        title={t('BCSC.Instructions.ScanBarcode')}
        accessibilityLabel={t('BCSC.Instructions.ScanBarcode')}
        testID={testIdWithKey('ScanBarcode')}
        onPress={() => navigation.navigate(BCSCScreens.ScanSerial)}
        buttonType={ButtonType.Primary}
      />
      <View style={{ marginTop: Spacing.md }}>
        <Button
          title={t('BCSC.Instructions.EnterManually')}
          accessibilityLabel={t('BCSC.Instructions.EnterManually')}
          testID={testIdWithKey('EnterManually')}
          onPress={() => navigation.navigate(BCSCScreens.ManualSerial)}
          buttonType={ButtonType.Secondary}
        />
      </View>
    </>
  )

  return (
    <ScreenWrapper
      edges={['bottom', 'left', 'right']}
      safeAreaViewStyle={styles.pageContainer}
      controlsContainerStyle={styles.controlsContainer}
      scrollViewProps={{ contentContainerStyle: styles.scrollView }}
      controls={controls}
    >
      <Image source={{ uri: SERIAL_HIGHLIGHT_IMAGE }} style={styles.image} resizeMode={'contain'} />
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.Instructions.Heading')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.sm }}>{t('BCSC.Instructions.Paragraph')}</ThemedText>
    </ScreenWrapper>
  )
}

export default SerialInstructionsScreen
