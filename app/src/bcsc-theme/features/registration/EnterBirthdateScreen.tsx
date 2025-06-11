import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'
import { Button, ButtonType, testIdWithKey, useStore, useTheme } from '@bifold/core'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import DatePicker from 'react-native-date-picker'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BCDispatchAction, BCState } from '@/store'
import { BCThemeNames } from '@/constants'

type EnterBirthdateScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.EnterBirthdate>
  route: { params: { stepIndex: number } }
}
const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation, route }) => {
  console.log('ENTER BIRTHDATE SCREEN RENDERED')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  const today = new Date()
  const { t } = useTranslation()
  const { ColorPallet, TextTheme, themeName } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [date, setDate] = useState(store.bcsc.birthdate ?? today)

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
    heading: {
      ...TextTheme.headingThree,
      marginBottom: 16,
    },
    paragraph: {
      ...TextTheme.normal,
      marginBottom: 8,
    },
    lineBreak: {
      height: 8,
      backgroundColor: ColorPallet.grayscale.veryLightGrey,
      width: '100%',
      marginBottom: 16,
    },
  })

  const onSubmit = useCallback(() => {
    dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [date] })
  }, [dispatch, date])

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.paragraph}>{t('Unified.Birthdate.CardSerialNumber', { serial: store.bcsc.serial })}</Text>
        <View style={styles.lineBreak} />
        <Text style={styles.heading}>{t('Unified.Birthdate.Heading')}</Text>
        <Text style={styles.paragraph}>{t('Unified.Birthdate.Paragraph')}</Text>
        <DatePicker
          theme={themeName === BCThemeNames.BCSC ? 'dark' : 'light'}
          mode={'date'}
          date={date}
          onDateChange={setDate}
          maximumDate={today}
        />
      </ScrollView>
      <View style={styles.controlsContainer}>
        <Button
          title={t('Global.Done')}
          accessibilityLabel={t('Global.Done')}
          testID={testIdWithKey('Done')}
          onPress={onSubmit}
          buttonType={ButtonType.Primary}
        />
      </View>
    </SafeAreaView>
  )
}
export default EnterBirthdateScreen
