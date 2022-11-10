// import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from 'aries-bifold'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

// import { Locales, storeLanguage } from '../localization'
interface Language {
  id: string
  value: string
}

const IASEnvironment = () => {
  const { t, i18n } = useTranslation()
  const { ColorPallet, TextTheme, SettingsTheme } = useTheme()
  // List of available languages into the localization directory
  const languages = [
    { id: 'x', value: 'y' },
    // { id: Locales.en, value: t('Language.English', { lng: Locales.en }) },
    // { id: Locales.fr, value: t('Language.French', { lng: Locales.fr }) },
    // { id: Locales.ptBr, value: t('Language.Portuguese', { lng: Locales.ptBr }) },
  ]

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.primaryBackground,
      width: '100%',
    },
    section: {
      backgroundColor: SettingsTheme.groupBackground,
      paddingHorizontal: 25,
      paddingVertical: 16,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.primaryBackground,
      marginHorizontal: 25,
    },
  })

  const handleLanguageChange = () => {
    return
  }

  return (
    <SafeAreaView style={[styles.container]}>
      <FlatList
        data={languages}
        renderItem={({ item: language }) => {
          const { id, value }: Language = language
          return (
            <View style={[styles.section, styles.sectionRow]}>
              <Text style={[TextTheme.title]}>{value}</Text>
              <BouncyCheckbox
                disableText
                fillColor="#FFFFFFFF"
                unfillColor="#FFFFFFFF"
                size={36}
                innerIconStyle={{ borderColor: ColorPallet.brand.primary, borderWidth: 2 }}
                ImageComponent={() => <Icon name="circle" size={18} color={ColorPallet.brand.primary}></Icon>}
                onPress={async () => {
                  return
                }}
                isChecked={id === i18n.language}
                disableBuiltInState
              />
            </View>
          )
        }}
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
            <View style={[styles.itemSeparator]}></View>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

export default IASEnvironment
