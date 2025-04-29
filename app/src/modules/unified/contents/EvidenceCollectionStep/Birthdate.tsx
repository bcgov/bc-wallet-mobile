import { Button, ButtonType, testIdWithKey, useStore, useTheme } from '@bifold/core'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, ScrollView, View, Text } from 'react-native'
import DatePicker from 'react-native-date-picker'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BCDispatchAction, BCState } from '../../../../store'

type BirthdateContentProps = {
  onComplete: () => void
}

const BirthdateContent: React.FC<BirthdateContentProps> = ({ onComplete }: BirthdateContentProps) => {
  const today = new Date()
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [date, setDate] = useState(store.unified.birthdate ?? today)

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
    onComplete()
  }, [dispatch, date, onComplete])

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.paragraph}>
          {t('Unified.Birthdate.CardSerialNumber', { serial: store.unified.serial })}
        </Text>
        <View style={styles.lineBreak} />
        <Text style={styles.heading}>{t('Unified.Birthdate.Heading')}</Text>
        <Text style={styles.paragraph}>{t('Unified.Birthdate.Paragraph')}</Text>
        <DatePicker theme="dark" mode={'date'} date={date} onDateChange={setDate} maximumDate={today} />
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

export default BirthdateContent
