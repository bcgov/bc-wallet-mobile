import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import DateInput from '@/bcsc-theme/components/DateInput'
import { useIsDeviceAuthorizationRecovering } from '@/bcsc-theme/hooks/useDeviceAuthorizationRecovery'
import useFocusFirstInvalidField from '@/bcsc-theme/hooks/useFocusFirstInvalidField'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { parseBirthdateToLocalDate } from '@/bcsc-theme/utils/birthdate'
import { isHandledAppError } from '@/errors/appError'
import { TestIds } from '@/test-ids/registry'
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
import { useEnterBirthdateViewModel } from './useEnterBirthdateViewModel'

const FIELD_ORDER = ['birthDate'] as const

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
  const isRecovering = useIsDeviceAuthorizationRecovering()
  const isBusy = loading || isRecovering
  const [birthDate, setBirthDate] = useState<string>(vm.initialDate ? moment(vm.initialDate).format('YYYY/MM/DD') : '')
  const [birthDateError, setBirthDateError] = useState<string | undefined>(undefined)
  const { scrollViewRef, inputRefs, onContainerLayout, onFieldLayout, focusFirstInvalidField } =
    useFocusFirstInvalidField(FIELD_ORDER)

  const isBirthDateComplete = birthDate.length === 10

  const handleChangeBirthDate = (value: string) => {
    setBirthDate(value)
    // Surface the invalid-date error as soon as a full date is typed; clear it while editing.
    const error = value.length === 10 && !vm.isDateValid(value) ? t('BCSC.Birthdate.InvalidDate') : undefined
    setBirthDateError(error)
    // The keyboard is already up here, so the error would otherwise render beneath it.
    if (error) {
      focusFirstInvalidField({ birthDate: error })
    }
  }

  const handleSubmit = async () => {
    // Continue stays enabled for every input state; validate here so tapping it with an empty,
    // incomplete, or invalid date shows an error instead of silently doing nothing.
    if (!isBirthDateComplete || !vm.isDateValid(birthDate)) {
      const message = t('BCSC.Birthdate.InvalidDate')
      setBirthDateError(message)
      focusFirstInvalidField({ birthDate: message })
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
      if (!isHandledAppError(error)) {
        logger.error('Device authorization failed while entering birthdate', { error })
      }
    } finally {
      setLoading(false)
    }
  }

  const controls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey(TestIds.verify.enterBirthdate.continue)}
        onPress={handleSubmit}
        buttonType={ButtonType.Primary}
        disabled={isBusy}
      >
        {isBusy && <ButtonLoading />}
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      keyboardActive
      padded={false}
      controls={controls}
      scrollViewRef={scrollViewRef}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.Birthdate.Heading')}</ThemedText>
      <ThemedText>{t('BCSC.Birthdate.Paragraph')}</ThemedText>
      <View style={{ width: '100%' }} onLayout={onContainerLayout}>
        <DateInput
          ref={inputRefs.birthDate}
          onLayout={onFieldLayout('birthDate')}
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
