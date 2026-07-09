import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import DateInput from '@/bcsc-theme/components/DateInput'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { parseBirthdateToLocalDate } from '@/bcsc-theme/utils/birthdate'
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
import moment from 'moment'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { VerificationCardError } from '../verificationCardError'
import { useEnterBirthdateViewModel } from './useEnterBirthdateViewModel'

type EnterBirthdateScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterBirthdate>
}

const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation }: EnterBirthdateScreenProps) => {
  const vm = useEnterBirthdateViewModel(navigation)

  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [loading, setLoading] = useState(false)
  const [birthDate, setBirthDate] = useState<string>(vm.initialDate ? moment(vm.initialDate).format('YYYY/MM/DD') : '')
  const [birthDateError, setBirthDateError] = useState<string | undefined>(undefined)

  const isBirthDateComplete = birthDate.length === 10

  const handleChangeBirthDate = (value: string) => {
    setBirthDate(value)
    // Surface the invalid-date error as soon as a full date is typed; clear it while editing.
    setBirthDateError(value.length === 10 && !vm.isDateValid(value) ? t('BCSC.Birthdate.InvalidDate') : undefined)
  }

  const handleSubmit = async () => {
    // Continue stays enabled for every input state; validate here so tapping it with an empty,
    // incomplete, or invalid date shows an error instead of silently doing nothing.
    if (!isBirthDateComplete || !vm.isDateValid(birthDate)) {
      setBirthDateError(t('BCSC.Birthdate.InvalidDate'))
      return
    }

    try {
      setLoading(true)
      if (!vm.serial) {
        logger.error('EnterBirthdateScreen: No serial number available')
        navigation.goBack()
        return null
      }
      await vm.authorizeDevice(vm.serial, parseBirthdateToLocalDate(birthDate))
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
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
        onPress={handleSubmit}
        buttonType={ButtonType.Primary}
        disabled={loading}
      >
        {loading && <ButtonLoading />}
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      keyboardActive
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.Birthdate.Heading')}</ThemedText>
      <ThemedText>{t('BCSC.Birthdate.Paragraph')}</ThemedText>
      <View style={{ width: '100%' }}>
        <DateInput
          id={'birthDate'}
          label={t('BCSC.Birthdate.Label')}
          value={birthDate}
          onChange={handleChangeBirthDate}
          subtext={t('BCSC.Birthdate.ExampleDate')}
          error={birthDateError}
        />
      </View>
    </ScreenWrapper>
  )
}

export default EnterBirthdateScreen
