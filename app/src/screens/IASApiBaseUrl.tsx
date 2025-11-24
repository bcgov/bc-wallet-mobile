import { prepareEnvironmentSwitch } from '@/bcsc-theme/utils/environment-utils'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import React, { Dispatch, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCDispatchAction, BCState, IasBaseApiUrl } from '../store'

interface IASApiBaseUrlProps {
  shouldDismissModal: () => void
}

const IASApiBaseUrlScreen: React.FC<IASApiBaseUrlProps> = ({ shouldDismissModal }) => {
  const { t } = useTranslation()
  const { ColorPalette, TextTheme, SettingsTheme } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const uniqueUrls = Object.values(IasBaseApiUrl)

  const [selectedUrl, setSelectedUrl] = useState(store.developer.iasApiBaseUrl)
  const [hasChanges, setHasChanges] = useState(false)

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
    radioButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: ColorPalette.brand.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButtonSelected: {
      backgroundColor: ColorPalette.brand.primary,
    },
    radioButtonInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: ColorPalette.grayscale.white,
    },
    buttonContainer: {
      marginTop: 'auto',
      marginHorizontal: 20,
      marginBottom: 20,
    },
    buttonSpacer: {
      marginTop: 10,
    },
    separatorContainer: {
      backgroundColor: SettingsTheme.groupBackground,
    },
  })

  const handleUrlSelect = (url: string) => {
    setSelectedUrl(url)
    setHasChanges(url !== store.developer.iasApiBaseUrl)
  }

  const handleSave = async () => {
    if (!selectedUrl) {
      return
    }
    await prepareEnvironmentSwitch(
      selectedUrl,
      store,
      dispatch as unknown as Dispatch<BCDispatchAction>,
      logger as RemoteLogger
    )

    // Update the API base URL in the store
    dispatch({
      type: BCDispatchAction.UPDATE_IAS_API_BASE_URL,
      payload: [selectedUrl],
    })

    shouldDismissModal()
  }

  const handleCancel = () => {
    shouldDismissModal()
  }

  const renderItemSeparator = useCallback(
    () => (
      <View style={styles.separatorContainer}>
        <View style={styles.itemSeparator} />
      </View>
    ),
    [styles.separatorContainer, styles.itemSeparator]
  )

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={uniqueUrls}
        renderItem={({ item: url }) => {
          return (
            <TouchableOpacity
              style={[styles.section, styles.sectionRow]}
              onPress={() => handleUrlSelect(url)}
              testID={testIdWithKey(`IASApiBaseUrl-${url}`)}
            >
              <ThemedText style={TextTheme.title}>{url}</ThemedText>
              <View style={[styles.radioButton, selectedUrl === url && styles.radioButtonSelected]}>
                {selectedUrl === url ? <View style={styles.radioButtonInner} /> : null}
              </View>
            </TouchableOpacity>
          )
        }}
        ItemSeparatorComponent={renderItemSeparator}
      />
      <View style={styles.buttonContainer}>
        <Button
          title="Save"
          accessibilityLabel="Save IAS API Base URL"
          testID={testIdWithKey('SaveIASApiBaseUrl')}
          onPress={handleSave}
          buttonType={ButtonType.Primary}
          disabled={!hasChanges}
        />
        <View style={styles.buttonSpacer}>
          <Button
            title={t('Global.Cancel')}
            accessibilityLabel={t('Global.Cancel')}
            testID={testIdWithKey('CancelIASApiBaseUrl')}
            onPress={handleCancel}
            buttonType={ButtonType.Secondary}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

export default IASApiBaseUrlScreen
