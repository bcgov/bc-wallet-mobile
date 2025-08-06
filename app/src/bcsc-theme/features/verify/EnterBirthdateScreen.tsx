import {
  Button,
  ButtonType,
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
import { ScrollView, StyleSheet, View } from 'react-native'
import DatePicker from 'react-native-date-picker'
import { SafeAreaView } from 'react-native-safe-area-context'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { BCSCCardType } from '@/bcsc-theme/types/cards'

type EnterBirthdateScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EnterBirthdate>
}

const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation }: EnterBirthdateScreenProps) => {
  const today = new Date()
  const { t } = useTranslation()
  const { ColorPalette, themeName, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [date, setDate] = useState(store.bcsc.birthdate ?? today)
  const [loading, setLoading] = useState(false)
  const { ButtonLoading } = useAnimatedComponents()
  const { authorization } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
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
    lineBreak: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      width: '100%',
      marginBottom: Spacing.md,
    },
  })

  const onSubmit = useCallback(async () => {
    try {
      setLoading(true)
      dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [date] })
      const { expires_in, user_code, device_code, verified_email } = await authorization.authorizeDevice(
        store.bcsc.serial,
        date
      )
      const expiresAt = new Date(Date.now() + expires_in * 1000)
      dispatch({
        type: BCDispatchAction.UPDATE_EMAIL,
        payload: [{ email: verified_email, emailConfirmed: !!verified_email }],
      })
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [device_code] })
      dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [user_code] })
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })

      // TODO: (al) navigation here will need to change when the Other card type is selected (non-photo non bc card)
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

    // if successful, navigation reset to setup steps screen
    // if not successful, navigate to mismatch screen
  }, [dispatch, date, navigation, authorization, store.bcsc.serial, logger])

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <ThemedText style={{ marginBottom: Spacing.sm }}>
          {t('Unified.Birthdate.CardSerialNumber', { serial: store.bcsc.serial })}
        </ThemedText>
        <View style={styles.lineBreak} />
        <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
          {t('Unified.Birthdate.Heading')}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.sm }}>{t('Unified.Birthdate.Paragraph')}</ThemedText>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <DatePicker
            theme={themeName === BCThemeNames.BCSC ? 'dark' : 'light'}
            mode={'date'}
            date={date}
            onDateChange={setDate}
            maximumDate={today}
          />
        </View>
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
