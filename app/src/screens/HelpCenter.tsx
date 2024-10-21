import { useTheme, testIdWithKey } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ContactUs from '../components/ContactUs'
import RowSection from '../components/RowSection'

const HelpCenter: React.FC = () => {
  const { TextTheme, ColorPallet } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    container: {
      flex: 2,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 20,
    },
    sectionCopyright: {
      flex: 1,
      justifyContent: 'flex-end',
      ...TextTheme.headingOne,
      margin: 10,
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <RowSection
          showSectionTitle
          sectionTitle="Apprendre l'Application"
          title="Guide d'utilisation"
          accessibilityLabel={t('About.Accessibility')}
          testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
          showRowSeparator
          showArrowIcon={true}
          showSectionSeparator
        />
        <RowSection
          title="Lorem ipsum"
          accessibilityLabel={t('About.Accessibility')}
          testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
          showRowSeparator
          showArrowIcon={true}
          showSectionSeparator
        />
        <RowSection
          title="Lorem ipsum dolor"
          accessibilityLabel={t('About.Accessibility')}
          testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
          showArrowIcon={true}
          showSectionSeparator
        />
        <RowSection
          showSectionTitle
          sectionTitle="Tutoriel"
          title="Tour guidé de l'application"
          accessibilityLabel={t('About.Accessibility')}
          testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
          showRowSeparator
          showArrowIcon={true}
          showSectionSeparator
        />
        <RowSection
          title="Recevoir et partager une attestation"
          accessibilityLabel={t('About.Accessibility')}
          testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
          showRowSeparator
          showArrowIcon={true}
          showSectionSeparator
        />
        <RowSection
          title="Aidez nous à améliorer l'application"
          accessibilityLabel={t('About.Accessibility')}
          testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
          showArrowIcon={true}
          showSectionSeparator
        />
        <RowSection
          showSectionTitle
          sectionTitle="Votre opinion"
          title="Signaler un problème"
          accessibilityLabel={t('About.Accessibility')}
          testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
          showRowSeparator
          showArrowIcon={true}
          showSectionSeparator
        />
        <RowSection
          title="Partager votre opinion de l'application"
          accessibilityLabel={t('About.Accessibility')}
          testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
          showArrowIcon={true}
          showSectionSeparator
        />
        <ContactUs />
        <View style={[styles.sectionCopyright]}>
          <Text style={styles.sectionCopyrightText}> {t('OptionsPlus.Copyright')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default HelpCenter
