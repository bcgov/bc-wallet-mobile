import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import SerialHighlightImage from '@assets/img/highlight_serial_barcode.png'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
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
  const { Spacing } = useTheme()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    image: {
      width: width - Spacing.md * 6,
      height: (width - Spacing.md * 6) * twoThirds,
      padding: Spacing.lg,
      alignSelf: 'center',
      marginBottom: Spacing.lg,
    },
  })

  return (
    <ScreenWrapper scrollViewContainerStyle={{ gap: Spacing.sm, flexGrow: 1 }}>
      <Image source={{ uri: SERIAL_HIGHLIGHT_IMAGE }} style={styles.image} resizeMode={'contain'} />
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.Instructions.Heading')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.sm }}>{t('BCSC.Instructions.Paragraph')}</ThemedText>

      <View style={{ marginTop: 'auto', gap: Spacing.md }}>
        <Button
          title={t('BCSC.Instructions.ScanBarcode')}
          accessibilityLabel={t('BCSC.Instructions.ScanBarcode')}
          testID={testIdWithKey('ScanBarcode')}
          onPress={() => navigation.navigate(BCSCScreens.ScanSerial)}
          buttonType={ButtonType.Primary}
        />
        <Button
          title={t('BCSC.Instructions.EnterManually')}
          accessibilityLabel={t('BCSC.Instructions.EnterManually')}
          testID={testIdWithKey('EnterManually')}
          onPress={() => navigation.navigate(BCSCScreens.ManualSerial)}
          buttonType={ButtonType.Secondary}
        />
      </View>
    </ScreenWrapper>
  )
}

export default SerialInstructionsScreen
