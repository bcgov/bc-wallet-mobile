import { useTheme } from '@hyperledger/aries-bifold-core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import CalendarImg from '../assets/img/calendar-empty.svg'
import ClockImg from '../assets/img/clock.svg'
import PhoneImg from '../assets/img/telephone.svg'

const ContactUs: React.FC = () => {
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },

    textHeaderTitle: {
      ...TextTheme.headingThree,
      flexShrink: 1,
      color: TextTheme.headingThree.color,
      paddingTop: 8,
      paddingBottom: 8,
    },
    textSectionTitle: {
      ...TextTheme.title,
      flexShrink: 1,
      color: TextTheme.bold.color,
      paddingTop: 8,
      paddingBottom: 8,
    },
    section: {
      paddingVertical: 12,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionDoubleRow: {
      paddingTop: 10,
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
      marginLeft: 10,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.section}>
        <Text style={styles.textSectionTitle}> {t('OptionsPlus.JoinUsTitle')}</Text>
      </View>
      <View style={styles.sectionRow}>
        <CalendarImg />
        <Text style={styles.sectionDescription}> {t('OptionsPlus.DaysOpen')}</Text>
      </View>
      <View style={styles.sectionRow}>
        <ClockImg />
        <Text style={styles.sectionDescription}> {t('OptionsPlus.OpeningHours')}</Text>
      </View>
      <View style={styles.sectionDoubleRow}>
        <PhoneImg style={styles.phoneImage} />
        <Text style={styles.sectionDescription}>
          {t('OptionsPlus.PhoneNumber')}
          {'\n'}
          {t('OptionsPlus.TollFreeNumber')}
        </Text>
      </View>
    </SafeAreaView>
  )
}

export default ContactUs
