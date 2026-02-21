import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCThemeNames } from '@/constants'
import { isHandledAppError } from '@/errors/appError'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import DatePicker from 'react-native-date-picker'
import { VerificationCardError } from '../verificationCardError'
import { useEnterBirthdateViewModel } from './useEnterBirthdateViewModel'

type EnterBirthdateScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterBirthdate>
}

const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation }: EnterBirthdateScreenProps) => {
  const today = new Date()
  const { t } = useTranslation()
  const { themeName, Spacing } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const vm = useEnterBirthdateViewModel(navigation)

  const [loading, setLoading] = useState(false)
  const [pickerState, setPickerState] = useState<'idle' | 'spinning'>('idle')
  const [date, setDate] = useState(vm.initialDate ?? today)
  const dateRef = useRef(vm.initialDate ?? today)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const styles = StyleSheet.create({
    lineBreak: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      width: '100%',
      marginBottom: Spacing.md,
    },
  })

  // Debounce onDateChange to wait for the wheel picker to settle before
  // committing the value. The picker fires intermediate values as the
  // wheel decelerates; without this the submitted date can be wrong.
  // https://github.com/henninghall/react-native-date-picker/issues/724#issuecomment-2325661774
  const onDateChange = useCallback((newDate: Date) => {
    const year = newDate.getFullYear()
    const month = newDate.getMonth()
    const day = newDate.getDate()
    const realDate = new Date(year, month, day, 12, 0, 0, 0)

    dateRef.current = realDate
    setPickerState('spinning')

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDate(realDate)
      setPickerState('idle')
    }, 400)
  }, [])

  const handleSubmit = async () => {
    try {
      setLoading(true)
      if (!vm.serial) {
        logger.error('EnterBirthdateScreen: No serial number available')
        navigation.goBack()
        return null
      }

      await vm.authorizeDevice(vm.serial, dateRef.current)
    } catch (error) {
      if (isHandledAppError(error)) {
        return
      }

      logger.error('CSN and birthdate mismatch, card not found', { error })
      navigation.navigate(BCSCScreens.VerificationCardError, {
        errorType: VerificationCardError.MismatchedSerial,
      })
    } finally {
      setLoading(false)
    }
  }

  const controls = (
    <Button
      title={t('Global.Done')}
      accessibilityLabel={t('Global.Done')}
      testID={testIdWithKey('Done')}
      onPress={() => {
        if (pickerState === 'spinning') {
          return
        }
        handleSubmit()
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
        {t('BCSC.Birthdate.CardSerialNumber', { serial: vm.serial })}
      </ThemedText>
      <View style={styles.lineBreak} />
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.Birthdate.Heading')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.sm }}>{t('BCSC.Birthdate.Paragraph')}</ThemedText>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <DatePicker
          theme={themeName === BCThemeNames.BCSC ? 'dark' : 'light'}
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
