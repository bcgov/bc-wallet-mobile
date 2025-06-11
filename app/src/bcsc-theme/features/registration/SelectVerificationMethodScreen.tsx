import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'
import { testIdWithKey, Text, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type SelectVerificationMethodScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.SelectVerificationMethod>
  route: { params: { stepIndex: number } }
}
const SelectVerificationMethodScreen: React.FC<SelectVerificationMethodScreenProps> = ({ navigation, route }) => {
  const { nextStep } = useWorkflow()
  const { t } = useTranslation()
  const { ColorPallet, TextTheme, themeName } = useTheme()
  const { stepIndex } = route.params

  const styles = StyleSheet.create({
    pageContainer: {
      height: '100%',
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <Pressable
        onPress={() => {
          console.log('GO TO IN PERSON CODE SCREEN')
          nextStep(navigation, stepIndex)
        }}
        accessible={false}
        testID={testIdWithKey('Step1')}
        accessibilityLabel={'Step 1'}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 24,
            paddingHorizontal: 24,
            backgroundColor: ColorPallet.brand.secondaryBackground,
          }}
        >
          <Icon name={'account'} size={48} color={ColorPallet.brand.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <ThemedText variant={'headingFour'} style={{ color: ColorPallet.brand.primary }}>
              {'In Person'}
            </ThemedText>
            <Text style={{ color: ColorPallet.grayscale.white }}>{'Find out where to go and what to bring.'}</Text>
          </View>
          <Icon name={'chevron-right'} size={32} color={ColorPallet.grayscale.white} />
        </View>
      </Pressable>
    </SafeAreaView>
  )
}
export default SelectVerificationMethodScreen
