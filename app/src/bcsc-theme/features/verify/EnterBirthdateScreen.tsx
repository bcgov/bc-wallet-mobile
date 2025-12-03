import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import DatePicker from 'react-native-date-picker'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

type EnterBirthdateScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterBirthdate>
}

const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation }: EnterBirthdateScreenProps) => {
  const today = new Date()
  const { t } = useTranslation()
  const { themeName, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [date, setDate] = useState(store.bcsc.birthdate ?? today)
  const [loading, setLoading] = useState(false)
  const { ButtonLoading } = useAnimatedComponents()
  const { authorization } = useApi()
  const [pickerState, setPickerState] = useState<'idle' | 'spinning'>('idle')
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    lineBreak: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      width: '100%',
      marginBottom: Spacing.md,
    },
  })

  // https://github.com/henninghall/react-native-date-picker/issues/724#issuecomment-2325661774
  const onDateChange = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    const realDate = new Date(year, month, day, 12, 0, 0, 0)
    setDate(realDate)
  }

  const onSubmit = useCallback(async () => {
    try {
      setLoading(true)
      dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [date] })
      const deviceAuth = await authorization.authorizeDevice(store.bcsc.serial, date)

      // device already authorized
      if (deviceAuth === null) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
        return
      }

      const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
      dispatch({
        type: BCDispatchAction.UPDATE_EMAIL,
        payload: [{ email: deviceAuth.verified_email, emailConfirmed: !!deviceAuth.verified_email }],
      })
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [deviceAuth.device_code] })
      dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [deviceAuth.user_code] })
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })
      dispatch({
        type: BCDispatchAction.UPDATE_VERIFICATION_OPTIONS,
        payload: [deviceAuth.verification_options.split(' ')],
      })

      if (store.bcsc.cardType === BCSCCardType.NonPhoto) {
        navigation.navigate(BCSCScreens.AdditionalIdentificationRequired)
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
      }
    } catch (error) {
      logger.error(`Error during BCSC verification: ${error}`)
      navigation.navigate(BCSCScreens.MismatchedSerial)
    } finally {
      setLoading(false)
    }
  }, [dispatch, date, navigation, authorization, store.bcsc.serial, logger, store.bcsc.cardType])

  const controls = (
    <Button
      title={t('Global.Done')}
      accessibilityLabel={t('Global.Done')}
      testID={testIdWithKey('Done')}
      onPress={() => {
        if (pickerState === 'spinning') {
          return
        }
        onSubmit()
      }}
      buttonType={ButtonType.Primary}
      disabled={loading}
    >
      {loading && <ButtonLoading />}
    </Button>
  )
  return (
    <ScreenWrapper controls={controls}>
      <ThemedText style={{ marginBottom: Spacing.sm }}>
        {t('BCSC.Birthdate.CardSerialNumber', { serial: store.bcsc.serial })}
      </ThemedText>
      <View style={styles.lineBreak} />
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.Birthdate.Heading')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.sm }}>{t('BCSC.Birthdate.Paragraph')}</ThemedText>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <DatePicker
          theme={themeName === BCThemeNames.BCSC ? 'dark' : 'light'}
          locale={t('BCSC.LocaleStringFormat')}
          mode={'date'}
          date={date}
          onDateChange={onDateChange}
          onStateChange={setPickerState}
        />
      </View>
    </ScreenWrapper>
  )
}

export default EnterBirthdateScreen
