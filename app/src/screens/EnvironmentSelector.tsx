import { Button, ButtonType, testIdWithKey, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { BCState, IASEnvironment } from '../store'

interface EnvironmentSelectorProps {
  onEnvironmentChange: (environment: IASEnvironment) => Promise<void>
  onCancel: () => void
}

/**
 * Shared environment selector component used by both BC Wallet and BCSC modes.
 * Allows developers to switch between different IAS environments for testing purposes.
 */
const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({ onEnvironmentChange, onCancel }) => {
  const { t } = useTranslation()
  const { ColorPalette, TextTheme, SettingsTheme } = useTheme()
  const [store] = useStore<BCState>()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      width: '100%',
      flex: 1,
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
      borderBottomColor: ColorPalette.brand.primaryBackground,
      marginHorizontal: 25,
    },
  })

  const handleEnvironmentPress = async (environment: IASEnvironment) => {
    await onEnvironmentChange(environment)
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={Object.values(IASEnvironment)}
        renderItem={({ item: environment }) => {
          const { name }: IASEnvironment = environment
          return (
            <View style={[styles.section, styles.sectionRow]}>
              <Text style={TextTheme.title}>{name}</Text>
              <BouncyCheckbox
                accessibilityLabel={name}
                disableText
                fillColor="#FFFFFFFF"
                unfillColor="#FFFFFFFF"
                size={36}
                innerIconStyle={{ borderColor: ColorPalette.brand.primary, borderWidth: 2 }}
                ImageComponent={() => <Icon name="circle" size={18} color={ColorPalette.brand.primary}></Icon>}
                onPress={() => {
                  handleEnvironmentPress(environment)
                }}
                isChecked={name === store.developer.environment.name}
                disableBuiltInState
                testID={testIdWithKey(name.toLocaleLowerCase())}
              />
            </View>
          )
        }}
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
            <View style={styles.itemSeparator}></View>
          </View>
        )}
      />
      <View style={{ marginTop: 30, marginHorizontal: 20 }}>
        <Button
          title={t('Global.Cancel')}
          accessibilityLabel={t('Global.Cancel')}
          testID={testIdWithKey('Cancel')}
          onPress={onCancel}
          buttonType={ButtonType.Secondary}
        />
      </View>
    </SafeAreaView>
  )
}

export default EnvironmentSelector
