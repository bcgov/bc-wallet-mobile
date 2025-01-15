import { useTheme } from '@hyperledger/aries-bifold-core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'

import CalendarImg from '../assets/img/calendar-empty.svg'
import ClockImg from '../assets/img/clock.svg'
import PhoneImg from '../assets/img/telephone.svg'

const ContactUs: React.FC = () => {
  const { TextTheme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    textHeaderTitle: {
      ...TextTheme.headingThree,
      color: TextTheme.headingThree.color,
      paddingVertical: 8,
    },
    textSectionTitle: {
      ...TextTheme.title,
      flexShrink: 1,
      color: TextTheme.bold.color,
    },
    section: {
      paddingVertical: 12,
    },
    sectionRow: {
      paddingVertical: 8,
      flexDirection: 'row',
      alignContent: 'center',
      alignItems: 'center',
    },
    sectionDoubleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      height: 100,
    },
    phoneImage: {
      width: 24,
      height: 24,
    },
    sectionDescription: {
      ...TextTheme.normal,
      color: TextTheme.normal.color,
      textAlign: 'left',
      textDecorationLine: 'none',
      paddingLeft: 10,
    },
  })

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.textSectionTitle}>{t('OptionsPlus.JoinUsTitle')}</Text>
      </View>
      <View style={styles.sectionRow}>
        <CalendarImg />
        <Text style={styles.sectionDescription}>{t('OptionsPlus.DaysOpen')}</Text>
      </View>
      <View style={styles.sectionRow}>
        <ClockImg />
        <Text style={styles.sectionDescription}>{t('OptionsPlus.OpeningHours')}</Text>
      </View>
      <View style={[styles.sectionRow, styles.sectionDoubleRow]}>
        <PhoneImg style={styles.phoneImage} />
        <Text style={styles.sectionDescription}>
          {t('OptionsPlus.PhoneNumber')}
          {'\n'}
          {t('OptionsPlus.TollFreeNumber')}
        </Text>
      </View>
    </View>
  )
}

export default ContactUs
