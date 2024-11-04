import { useTheme } from '@hyperledger/aries-bifold-core'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import CalendarImg from '../assets/img/calendar-empty.svg'
import ClockImg from '../assets/img/clock.svg'
import PhoneImg from '../assets/img/telephone.svg'

type DetailsType = {
  daysOpen: string
  openingHours: string
  phone: string
  phoneSec?: string
}

type ContactType = {
  details: DetailsType
}

type HelpContactUsProps = {
  itemContact: ContactType[]
}
const HelpContactUs = ({ itemContact = [] }: HelpContactUsProps) => {
  const { ColorPallet, TextTheme } = useTheme()

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
      {itemContact.map((item, index) => (
        <>
          <View key={index}>
            <View style={styles.sectionRow}>
              <CalendarImg />
              <Text style={styles.sectionDescription}> {item.details.daysOpen}</Text>
            </View>
            <View style={styles.sectionRow}>
              <ClockImg />
              <Text style={styles.sectionDescription}> {item.details.openingHours}</Text>
            </View>
            <View style={styles.sectionDoubleRow}>
              <PhoneImg style={styles.phoneImage} />
              <Text style={styles.sectionDescription}>
                {item.details.phone}
                {'\n'}
                {item.details.phoneSec}
              </Text>
            </View>
          </View>
        </>
      ))}
    </SafeAreaView>
  )
}

export default HelpContactUs
