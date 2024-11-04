import { useTheme, testIdWithKey, Button, ButtonType } from '@hyperledger/aries-bifold-core'
import { NavigationProp, RouteProp } from '@react-navigation/native'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageSourcePropType, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import InfosDisplay from '../components/InfosDisplay'
import { Screens } from '../navigators/navigators'

type ItemContent = {
  title?: string
  text?: string
  visual?: ImageSourcePropType
  question?: string
  answer?: string
}
type ItemSection = {
  title: string
  content: ItemContent[]
}
type HelpCenterRouteParams = {
  selectedSection: ItemSection[]
  sectionNo: number
}
type HelpCenterStackParams = {
  'Help Center': undefined
  'Help Center Page': HelpCenterRouteParams
}

type HelpCenterProps = {
  route: RouteProp<HelpCenterStackParams, 'Help Center Page'>
  navigation: NavigationProp<HelpCenterStackParams>
}

const HelpCenterPage: React.FC<HelpCenterProps> = ({ route, navigation }) => {
  const { TextTheme, ColorPallet } = useTheme()
  const { t } = useTranslation()
  const { selectedSection, sectionNo } = route.params
  const content = selectedSection[sectionNo].content
  const sectionTitle = selectedSection[sectionNo].title

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
    button: {
      margin: 20,
      marginTop: 20,
      marginBottom: 20,
    },
  })

  useEffect(() => {
    navigation.setOptions({ title: sectionTitle })
  }, [sectionTitle])

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {content.map((item, index) => (
          <View key={index}>
            <InfosDisplay
              title={item?.title}
              detail={item?.text}
              visual={item?.visual}
              question={item?.question}
              answer={item?.answer}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.button}>
        <Button
          buttonType={ButtonType.Secondary}
          testID={testIdWithKey('StartProcess')}
          accessibilityLabel={t('HelpCenter.ButtonHelpCenter')}
          title={t('HelpCenter.ButtonHelpCenter')}
          onPress={() => navigation.navigate(Screens.HelpCenter)}
        ></Button>
      </View>
    </SafeAreaView>
  )
}

export default HelpCenterPage
