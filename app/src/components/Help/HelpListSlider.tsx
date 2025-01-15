import { useTheme } from '@hyperledger/aries-bifold-core'
import { i18n } from '@hyperledger/aries-bifold-core/App/localization'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { itemsDataEn } from '../../assets/Index_en'
import { itemsDataFr } from '../../assets/Index_fr'
import { hitSlop } from '../../constants'
import { BCWalletEventTypes } from '../../events/eventTypes'
import { RootStackParams, Screens, Stacks } from '../../navigators/navigators'

const HelpListSlider: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParams>>()
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()
  const currentLanguage = i18n.language
  const helpIndex = currentLanguage === 'fr' ? itemsDataFr.centreAide.sommaire : itemsDataEn.centreAide.sommaire
  const [addHelpPressed, setAddHelpPressed] = useState<boolean>(false)
  const [localRouteName, setLocalRouteName] = useState<string>('Home')
  const [headerHeight, setHeaderHeight] = useState<number>(0)

  const styles = StyleSheet.create({
    centeredView: {
      position: 'absolute',
      top: headerHeight,
      left: 0,
      right: 0,
      justifyContent: 'flex-start',
      zIndex: 2,
    },
    outsideListener: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowTitle: {
      ...TextTheme.headingFour,
      flex: 1,
      fontWeight: 'normal',
      flexWrap: 'wrap',
      paddingBottom: 10,
      textAlign: 'left',
      width: '100%',
      maxWidth: '100%',
    },
    modalView: {
      backgroundColor: ColorPallet.grayscale.white,
      shadowColor: '#000',
      padding: 20,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '100%',
    },
    drawerTitleText: {
      ...TextTheme.normal,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 10,
    },
    drawerRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      marginVertical: 12,
      flexWrap: 'wrap',
    },
    drawerRowItem: {
      color: ColorPallet.brand.primary,
    },
  })

  const paramDataClose = {
    isActive: false,
  }
  const deactivateSlider = useCallback(() => {
    DeviceEventEmitter.emit(BCWalletEventTypes.ADD_HELP_PRESSED, paramDataClose)
  }, [])

  useEffect(() => {
    const handle = DeviceEventEmitter.addListener(BCWalletEventTypes.ADD_HELP_PRESSED, (paramData) => {
      const { isActive, routeName, headerHeight } = paramData
      const newVal = isActive === undefined ? !addHelpPressed : isActive
      setAddHelpPressed(newVal)
      setLocalRouteName(routeName)
      setHeaderHeight(headerHeight)
    })

    return () => {
      handle.remove()
    }
  }, [])

  function hasTitle(item: { title: string } | { question: string }): item is { title: string } {
    return (item as { title: string }).title !== undefined
  }

  function validateScreen(screen: Array<string>, routeName: string): boolean {
    return screen.includes(routeName)
  }

  return (
    <Modal transparent={true} visible={addHelpPressed} onRequestClose={deactivateSlider}>
      <TouchableOpacity style={styles.outsideListener} onPress={deactivateSlider} hitSlop={hitSlop} />
      <View style={styles.centeredView}>
        {/* Suppression de l'animation d'opacité */}
        <View style={styles.modalView}>
          <View>
            {helpIndex.map((sectionItem, index) => (
              <View key={index}>
                {sectionItem.sections.map((section, indexSect) => (
                  <View key={indexSect}>
                    {section.content.map((contentItem, indexContent) => (
                      <View key={indexContent}>
                        {validateScreen(contentItem.screen, localRouteName) && (
                          <TouchableOpacity
                            style={styles.drawerRow}
                            onPress={() => {
                              deactivateSlider()
                              navigation.navigate(Stacks.HelpCenterStack, {
                                screen: Screens.HelpCenterPage,
                                params: {
                                  selectedSection: sectionItem.sections,
                                  sectionNo: indexSect,
                                  titleParam: contentItem.title,
                                },
                              })
                            }}
                            accessibilityRole="button"
                          >
                            <Text style={{ ...styles.drawerRowItem, marginLeft: 5 }}>
                              {hasTitle(contentItem) && contentItem.title}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.drawerRow}
            accessibilityRole="button"
            onPress={() => {
              deactivateSlider()
              navigation.navigate(Stacks.HelpCenterStack as never, { screen: Screens.HelpCenter } as never)
            }}
          >
            <View>
              <Text style={{ ...styles.drawerRowItem, marginLeft: 5 }}>{t('HelpCenter.ConsultHelpCenter')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default HelpListSlider
