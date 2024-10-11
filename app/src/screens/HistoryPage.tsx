import { useTheme } from '@hyperledger/aries-bifold-core'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const HistoryPage: React.FC = () => {
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      marginBottom: 20,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    innerContainer: {
      flex: 1,
    },
    mainSection: {
      flex: 5,
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
    button: {
      marginTop: 10,
      marginBottom: 10,
    },
    section: {
      paddingVertical: 12,
    },
    scroll: {
      flexGrow: 1,
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
    sectionCopyright: {
      flex: 1,
      justifyContent: 'flex-end',
      ...TextTheme.headingOne,
      margin: 10,
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
    sectionCopyrightText: {
      ...TextTheme.caption,
      color: TextTheme.normal.color,
      textAlign: 'left',
      textDecorationLine: 'none',
      marginLeft: 10,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.textHeaderTitle}> {t('Settings.History')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default HistoryPage
