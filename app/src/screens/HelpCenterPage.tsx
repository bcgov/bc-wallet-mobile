import { useTheme, testIdWithKey, Button, ButtonType } from '@hyperledger/aries-bifold-core'
import { NavigationProp, RouteProp } from '@react-navigation/native'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, ImageSourcePropType, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import InfosDisplay from '../components/InfosDisplay'
import { Screens } from '../navigators/navigators'

type ItemContent = {
  title?: string
  screen?: Array<string>
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
  titleParam: string
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
  const { selectedSection, sectionNo, titleParam } = route.params
  const content = selectedSection[sectionNo].content
  const sectionTitle = selectedSection[sectionNo].title

  const scrollViewRef = useRef<ScrollView>(null)
  const itemRefs = useRef<(View | null)[]>([])

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

  const scrollToElementWithAnimation = (title: string) => {
    const index = content.findIndex((item) => item.title === title)
    if (index !== -1 && itemRefs.current[index]) {
      itemRefs.current[index]?.measureLayout(scrollViewRef.current?.getScrollableNode(), (x, y) => {
        const scrollY = new Animated.Value(0)

        Animated.timing(scrollY, {
          toValue: y - 50,
          duration: 1000,
          useNativeDriver: false,
        }).start()

        scrollY.addListener(({ value }) => {
          scrollViewRef.current?.scrollTo({ x: 0, y: value, animated: false })
        })
      })
    }
  }
  useEffect(() => {
    if (titleParam) {
      scrollToElementWithAnimation(titleParam)
    }
  }, [titleParam])

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} ref={scrollViewRef}>
        {content.map((item, index) => (
          <View key={index} ref={(el) => (itemRefs.current[index] = el)} style={{ marginBottom: 20 }}>
            <InfosDisplay
              title={item?.title}
              screen={item?.screen}
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
        />
      </View>
    </SafeAreaView>
  )
}

export default HelpCenterPage
