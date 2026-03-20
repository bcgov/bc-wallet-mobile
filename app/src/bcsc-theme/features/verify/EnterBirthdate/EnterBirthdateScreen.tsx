import DateInput from '@/bcsc-theme/components/DateInput'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
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
import { StyleSheet, View } from 'react-native'
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

  const isBirthDateComplete = birthDate.length === 10
  const isBirthDateInvalid = isBirthDateComplete && !vm.isDateValid(birthDate)
  const birthDateError = isBirthDateInvalid ? t('BCSC.Birthdate.InvalidDate') : undefined

  const styles = StyleSheet.create({
    lineBreak: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      width: '100%',
      marginBottom: Spacing.md,
    },
  })

  const handleSubmit = async () => {
    if (!birthDate) {
      return
    }

    try {
      setLoading(true)
      if (!vm.serial) {
        logger.error('EnterBirthdateScreen: No serial number available')
        navigation.goBack()
        return null
      }
      // Converting date format from YYYY/MM/DD to YYYY-MM-DD for api
      await vm.authorizeDevice(vm.serial, moment(birthDate, 'YYYY-MM-DD').toDate())
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
      onPress={handleSubmit}
      buttonType={ButtonType.Primary}
      disabled={loading || !isBirthDateComplete || isBirthDateInvalid}
    >
      {loading && <ButtonLoading />}
    </Button>
  )

  return (
    <ScreenWrapper keyboardActive controls={controls}>
      <ThemedText style={{ marginBottom: Spacing.sm }}>
        {t('BCSC.Birthdate.CardSerialNumber', { serial: vm.serial })}
      </ThemedText>
      <View style={styles.lineBreak} />
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.Birthdate.Heading')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.Birthdate.Paragraph')}</ThemedText>
      <View style={{ marginVertical: Spacing.md, width: '100%' }}>
        <DateInput
          id={'birthDate'}
          label={t('BCSC.Birthdate.Label')}
          value={birthDate}
          onChange={setBirthDate}
          subtext={t('BCSC.Birthdate.ExampleDate')}
          error={birthDateError}
        />
      </View>
    </ScreenWrapper>
  )
}

export default EnterBirthdateScreen
