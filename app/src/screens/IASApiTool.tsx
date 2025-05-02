import { getServerStatus, getTermsOfUse } from '@/api/services/utility.service'
import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface IIASApiTool {
  shouldDismissModal: () => void
}
export const IASApiTool: React.FC<IIASApiTool> = ({ shouldDismissModal }) => {
  const { t } = useTranslation()
  const { ColorPallet, SettingsTheme } = useTheme()
  const [response, setResponse] = React.useState<any>(null)
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
    button: {
      marginTop: 20,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text>IAS API TOOL</Text>
        <Text>API Response:</Text>
        <Text>{response}</Text>
        <Button
          title="Server Status"
          onPress={() => {
            getServerStatus('ios').then((res) => {
              setResponse(JSON.stringify(res.data, null, 2))
            })
          }}
          buttonType={ButtonType.Primary}
        />
        <Button
          title="Terms of Use"
          onPress={() => {
            getTermsOfUse().then((res) => {
              setResponse(JSON.stringify(res.data, null, 2))
            })
          }}
          buttonType={ButtonType.Primary}
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
      </ScrollView>
    </SafeAreaView>
  )
}
