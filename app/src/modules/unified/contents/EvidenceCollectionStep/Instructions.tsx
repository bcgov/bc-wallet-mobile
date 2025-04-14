import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Text, StyleSheet, ScrollView, Image, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const pagePadding = 24
const twoThirds = 0.67

type InstructionsContentProps = {
  goToScan: () => void
  goToManualSerial: () => void
}

const InstructionsContent: React.FC<InstructionsContentProps> = ({
  goToScan,
  goToManualSerial,
}: InstructionsContentProps) => {
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    pageContainer: {
      height: '100%',
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.secondaryBackground,
    },
    scrollView: {
      flex: 1,
      padding: pagePadding,
    },
    controlsContainer: {
      marginBottom: 20,
      marginTop: 'auto',
      marginHorizontal: 20,
      position: 'relative',
    },
    image: {
      width: width - pagePadding * 2,
      height: (width - pagePadding * 2) * twoThirds,
      marginBottom: 24,
    },
    heading: {
      ...TextTheme.headingThree,
      marginBottom: 16,
    },
    paragraph: {
      ...TextTheme.normal,
      marginBottom: 8,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Image
          source={require('../../assets/img/highlight_serial_barcode.png')}
          style={styles.image}
          resizeMode={'contain'}
        />
        <Text style={styles.heading}>{t('Unified.Instructions.Heading')}</Text>
        <Text style={styles.paragraph}>{t('Unified.Instructions.Paragraph')}</Text>
      </ScrollView>
      <View style={styles.controlsContainer}>
        <Button
          title={t('Unified.Instructions.ScanBarcode')}
          accessibilityLabel={t('Unified.Instructions.ScanBarcode')}
          testID={testIdWithKey('ScanBarcode')}
          onPress={goToScan}
          buttonType={ButtonType.Primary}
        />
        <View style={{ marginTop: 16 }}>
          <Button
            title={t('Unified.Instructions.EnterManually')}
            accessibilityLabel={t('Unified.Instructions.EnterManually')}
            testID={testIdWithKey('EnterManually')}
            onPress={goToManualSerial}
            buttonType={ButtonType.Secondary}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

export default InstructionsContent
