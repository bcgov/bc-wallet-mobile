import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useTheme,
} from '@bifold/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import DatePicker from 'react-native-date-picker'

import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCThemeNames } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEnterBirthdateViewModel } from './EnterBirthdateViewModel'

type EnterBirthdateScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterBirthdate>
}

const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation }: EnterBirthdateScreenProps) => {
  const today = new Date()
  const { t } = useTranslation()
  const { themeName, Spacing } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()

  // Load view model
  const vm = useEnterBirthdateViewModel(navigation)

  // UI State management
  const [loading, setLoading] = useState(false)
  const [pickerState, setPickerState] = useState<'idle' | 'spinning'>('idle')
  const [date, setDate] = useState(vm.initialDate ?? today)

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

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await vm.authorizeDevice(vm.serial, date)
    } catch (error) {
      navigation.navigate(BCSCScreens.MismatchedSerial)
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
