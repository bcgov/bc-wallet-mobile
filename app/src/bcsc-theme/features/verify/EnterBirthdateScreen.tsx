import {
  Button,
  ButtonType,
  testIdWithKey,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import DatePicker from 'react-native-date-picker'
import { SafeAreaView } from 'react-native-safe-area-context'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

type EnterBirthdateScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EnterBirthdate>
}

const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation }: EnterBirthdateScreenProps) => {
  const today = new Date()
  const { t } = useTranslation()
  const { ColorPallet, TextTheme, themeName } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [date, setDate] = useState(store.bcsc.birthdate ?? today)
  const [loading, setLoading] = useState(false)
  const { ButtonLoading } = useAnimatedComponents()
  const { authorization } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

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

  const onSubmit = useCallback(async () => {
    try {
      setLoading(true)
      dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [date] })
      const { expires_in, user_code, device_code, verified_email } = await authorization.verifyInPerson(
        store.bcsc.serial,
        date
      )
      const expiresAt = new Date(Date.now() + expires_in * 1000)
      dispatch({ type: BCDispatchAction.UPDATE_EMAIL, payload: [verified_email] })
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [device_code] })
      dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [user_code] })
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
    } catch (error) {
      logger.error(`Error during BCSC verification: ${error}`)
      navigation.navigate(BCSCScreens.MismatchedSerial)
    } finally {
      setLoading(false)
    }

    // if successful, navigation reset to setup steps screen
    // if not successful, navigate to mismatch screen
  }, [dispatch, date, navigation, authorization, store.bcsc.serial, logger])

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
          disabled={loading}
        >
          {loading && <ButtonLoading />}
        </Button>
      </View>
    </SafeAreaView>
  )
}

export default EnterBirthdateScreen
