import { useTheme, testIdWithKey } from '@hyperledger/aries-bifold-core'
import { i18n } from '@hyperledger/aries-bifold-core/App/localization'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { itemsDataEn } from '../assets/Index_en'
import { itemsDataFr } from '../assets/Index_fr'
import HelpRowSection from '../components/HelpRowSection'
import { HelpCenterStackParams } from '../navigators/navigators'

type HelpCenterProps = StackScreenProps<HelpCenterStackParams>

const HelpCenter: React.FC<HelpCenterProps> = ({ navigation }) => {
  const { TextTheme, ColorPallet } = useTheme()
  const { t } = useTranslation()
  const currentLanguage = i18n.language
  const indexJs = currentLanguage === 'fr' ? itemsDataFr.centreAide.sommaire : itemsDataEn.centreAide.sommaire
  //const indexJson = currentLanguage === 'fr' ? require("../assets/json/Index_en.json") : require("../assets/json/Index_en.json")

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
        {indexJs.map((item, index) => (
          <View key={index}>
            <HelpRowSection
              showSectionTitle
              sectionTitle={item.title}
              itemSection={item.sections ? item.sections : []}
              accessibilityLabel={t('About.Accessibility')}
              testID={testIdWithKey(t('About.Accessibility').toLowerCase())}
              showRowSeparator
              showArrowIcon={true}
              navigation={navigation}
            />
          </View>
        ))}
        <View style={[styles.sectionCopyright]}>
          <Text style={styles.sectionCopyrightText}> {t('OptionsPlus.Copyright')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default HelpCenter
