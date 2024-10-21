import { useTheme, testIdWithKey } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import RowSection from '../components/RowSection'

const HelpCenter: React.FC = () => {
  const { TextTheme, ColorPallet } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    container: {
      flex: 2,
      paddingHorizontal: 20,
      backgroundColor: ColorPallet.brand.primaryBackground,
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
      <RowSection
        title={t('About.Accessibility')}
        accessibilityLabel={t('About.Accessibility')}
        testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
        showRowSeparator
        showArrowIcon={true}
        showSectionSeparator
      />
      <RowSection
        title={t('About.TermsOfUse')}
        accessibilityLabel={t('About.TermsOfUse')}
        testID={testIdWithKey(t('About.TermsOfUse').toLowerCase())}
        showRowSeparator
        showArrowIcon={true}
        showSectionSeparator
      />
      <RowSection
        title={t('About.PrivacyPolicy')}
        accessibilityLabel={t('About.PrivacyPolicy')}
        testID={testIdWithKey(t('About.PrivacyPolicy').toLowerCase())}
        showArrowIcon={true}
        showSectionSeparator
      />
      <View style={[styles.sectionCopyright]}>
        <Text style={styles.sectionCopyrightText}> {t('OptionsPlus.Copyright')}</Text>
      </View>
    </SafeAreaView>
  )
}

export default HelpCenter
