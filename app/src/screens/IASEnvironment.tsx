import { useTheme, useStore, Button, ButtonType, testIdWithKey } from 'aries-bifold'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

import { BCDispatchAction, BCState, IASEnvironment, iasEnvironments } from '../store'

interface IASEnvironmentProps {
  shouldDismissModal: () => void
}

const IASEnvironmentScreen: React.FC<IASEnvironmentProps> = ({ shouldDismissModal }) => {
  const { t } = useTranslation()
  const { ColorPallet, TextTheme, SettingsTheme } = useTheme()
  const [store, dispatch] = useStore<BCState>()

  const environments = iasEnvironments

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

  const handleEnvironmentChange = (environment: IASEnvironment) => {
    dispatch({
      type: BCDispatchAction.UPDATE_ENVIRONMENT,
      payload: [environment],
    })

    shouldDismissModal()
  }

  return (
    <SafeAreaView style={[styles.container]}>
      <FlatList
        data={environments}
        renderItem={({ item: environment }) => {
          const { name }: IASEnvironment = environment
          return (
            <View style={[styles.section, styles.sectionRow]}>
              <Text style={[TextTheme.title]}>{t(`Developer.${name}`)}</Text>
              <BouncyCheckbox
                accessibilityLabel={name}
                disableText
                fillColor="#FFFFFFFF"
                unfillColor="#FFFFFFFF"
                size={36}
                innerIconStyle={{ borderColor: ColorPallet.brand.primary, borderWidth: 2 }}
                ImageComponent={() => <Icon name="circle" size={18} color={ColorPallet.brand.primary}></Icon>}
                onPress={() => {
                  handleEnvironmentChange(environment)
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
            <View style={[styles.itemSeparator]}></View>
          </View>
        )}
      />
      <View style={{ marginTop: 30, marginHorizontal: 20 }}>
        <Button
          title={t('Global.Cancel')}
          accessibilityLabel={t('Global.Cancel')}
          testID={testIdWithKey('Cancel')}
          onPress={shouldDismissModal}
          buttonType={ButtonType.Secondary}
        />
      </View>
    </SafeAreaView>
  )
}

export default IASEnvironmentScreen
