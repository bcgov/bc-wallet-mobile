import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { Button, ButtonType, testIdWithKey, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { setIssuer } from 'react-native-bcsc-core'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { BCDispatchAction, BCState, IASEnvironment } from '../store'

interface IASEnvironmentProps {
  shouldDismissModal: () => void
}

const IASEnvironmentScreen: React.FC<IASEnvironmentProps> = ({ shouldDismissModal }) => {
  const { t } = useTranslation()
  const { ColorPalette, TextTheme, SettingsTheme } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const factoryReset = useFactoryReset()

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

  /**
   * Handles the change of the IAS environment by performing a factory reset and updating the store.
   *
   * Note: Switching environments currently requires a factory reset.
   * Persisting state between environments is a potential future enhancement.
   *
   * @param environment - The selected IAS environment to switch to.
   * @returns A promise that resolves when the environment change process is complete.
   * */
  const handleEnvironmentChange = async (environment: IASEnvironment) => {
    try {
      // hard factory reset, no state saved
      await factoryReset()

      dispatch({
        type: BCDispatchAction.UPDATE_ENVIRONMENT,
        payload: [environment],
      })

      const success = await setIssuer(environment.iasApiBaseUrl)

      logger.info('[BCSCCore] persisting issuer:', {
        issuer: environment.iasApiBaseUrl,
        name: environment.name,
        success: success,
      })
    } catch (error) {
      logger.error('Error during factory reset for environment change:', error as Error)
    }

    shouldDismissModal()
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
            <View style={styles.itemSeparator}></View>
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
