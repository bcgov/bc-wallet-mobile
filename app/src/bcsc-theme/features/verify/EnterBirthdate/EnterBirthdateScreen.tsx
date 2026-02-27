import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
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
import { Keyboard, StyleSheet, View } from 'react-native'
import DatePicker from 'react-native-date-picker'
import { VerificationCardError } from '../verificationCardError'
import { useEnterBirthdateViewModel } from './useEnterBirthdateViewModel'

type EnterBirthdateScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterBirthdate>
}

const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation }: EnterBirthdateScreenProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const vm = useEnterBirthdateViewModel(navigation)

  const [loading, setLoading] = useState(false)
  const [openDatePicker, setOpenDatePicker] = useState(false)
  const [birthDate, setBirthDate] = useState<string>(vm.initialDate ? moment(vm.initialDate).format('YYYY-MM-DD') : '')

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
      disabled={loading || !birthDate}
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
      <View style={{ marginVertical: Spacing.md, width: '100%' }}>
        <DatePicker
          modal
          open={openDatePicker}
          mode="date"
          title={t('BCSC.Birthdate.Label')}
          date={birthDate ? moment(birthDate).toDate() : new Date()}
          onConfirm={(date) => {
            setOpenDatePicker(false)
            setBirthDate(moment(date).format('YYYY-MM-DD'))
          }}
          onCancel={() => {
            setOpenDatePicker(false)
          }}
          testID={testIdWithKey('BirthDatePicker')}
          accessibilityLabel={t('BCSC.Birthdate.Label')}
        />
        <InputWithValidation
          id={'birthDate'}
          label={t('BCSC.Birthdate.Label')}
          value={birthDate}
          textInputProps={{ placeholder: 'YYYY-MM-DD' }}
          onChange={() => {
            // no-op to disable manual input
          }}
          onPressIn={() => {
            Keyboard.dismiss()
            setOpenDatePicker(true)
          }}
          subtext={t('BCSC.Birthdate.Paragraph')}
        />
      </View>
    </ScreenWrapper>
  )
}

export default EnterBirthdateScreen
