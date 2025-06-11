import { View, Text, useWindowDimensions, ScrollView, Image } from 'react-native'
import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'
import { StyleSheet } from 'react-native'
import { ButtonType, testIdWithKey, useTheme, Button } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'

type IdentityDescriptionScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.IdentityDescription>
  route: { params: { stepIndex: number } }
}
const IdentityDescriptionScreen: React.FC<IdentityDescriptionScreenProps> = ({ navigation, route }) => {
  console.log('IDENTITY SELECTION COMPONENT RENDERED')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
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
      padding: 24,
    },
    controlsContainer: {
      marginBottom: 20,
      marginTop: 'auto',
      marginHorizontal: 20,
      position: 'relative',
    },
    image: {
      width: width - 24 * 2,
      height: (width - 24 * 2) * 0.67,
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
          source={require('@assets/img/highlight_serial_barcode.png')}
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
          onPress={() => {}}
          buttonType={ButtonType.Primary}
        />
        <View style={{ marginTop: 16 }}>
          <Button
            title={t('Unified.Instructions.EnterManually')}
            accessibilityLabel={t('Unified.Instructions.EnterManually')}
            testID={testIdWithKey('EnterManually')}
            onPress={() => {
              nextStep(navigation, stepIndex)
            }}
            buttonType={ButtonType.Secondary}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}
export default IdentityDescriptionScreen
