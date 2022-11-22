// import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme, useStore, Button, ButtonType, testIdWithKey } from 'aries-bifold'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { BCDispatchAction } from '../store'

interface Environment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
}

interface IASEnvironmentProps {
  shouldDismissModal: () => void
}

const IASEnvironment: React.FC<IASEnvironmentProps> = ({ shouldDismissModal }) => {
  const { t } = useTranslation()
  const { ColorPallet, TextTheme, SettingsTheme } = useTheme()
  const [store, dispatch] = useStore()

  const environments: Array<Environment> = [
    {
      name: t('Developer.Production'),
      iasAgentInviteUrl:
        'https://idim-agent.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZTZiY2EwNzQtYmNmNC00ZjQzLTgwMjYtNWNjZjhkN2M4OTQyIiwgImxhYmVsIjogIklESU0iLCAic2VydmljZUVuZHBvaW50IjogImh0dHBzOi8vaWRpbS1hZ2VudC5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyIsICJyZWNpcGllbnRLZXlzIjogWyJHeXJxY2NQR1FtV3JxWGZ6cWtRTUF2VlBycmRWYUdwRkgxOHNOWkUzdUtGIl19',
      iasPortalUrl: 'https://id.gov.bc.ca/issuer/v1/dids',
    },
    {
      name: t('Developer.Development'),
      iasAgentInviteUrl:
        'https://idim-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZDQ3NWM3ZjQtMTRjMy00NzdkLWI2NTMtY2Y5MDM4NDJmNGJjIiwgInJlY2lwaWVudEtleXMiOiBbIjJlSHBRRm9uTUVobXpvYWVFbUFMS1dxZHF5UldZZkE2TFF5akpKdGdiMldUIl0sICJsYWJlbCI6ICJJRElNIChEZXYpIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQtZGV2LmFwcHMuc2lsdmVyLmRldm9wcy5nb3YuYmMuY2EiLCAiaW1hZ2VVcmwiOiAiaHR0cHM6Ly9pZC5nb3YuYmMuY2Evc3RhdGljL0dvdi0yLjAvaW1hZ2VzL2Zhdmljb24uaWNvIn0=',
      iasPortalUrl: 'https://iddev.gov.bc.ca/issuer/v1/dids',
    },
    {
      name: t('Developer.Test'),
      iasAgentInviteUrl:
        'https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNmNjMjJiNTYtZmQwYy00Yjc4LWE3ZTQtYzYwYzJlODBlMDM0IiwgInJlY2lwaWVudEtleXMiOiBbIkNoSmJDTTVZSlMxb3hTQU1WNU1vY1J5cE1tUVp0eFFqcG9KWEZpTHZnMUM5Il0sICJsYWJlbCI6ICJJRElNIChTSVQpIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tc2l0LWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyJ9',
      iasPortalUrl: 'https://idsit.gov.bc.ca/issuer/v1/dids',
    },
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

  const handleEnvironmentChange = (environment: Environment) => {
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
          const { name }: Environment = environment
          return (
            <View style={[styles.section, styles.sectionRow]}>
              <Text style={[TextTheme.title]}>{name}</Text>
              <BouncyCheckbox
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
          testID={testIdWithKey('cancel')}
          onPress={shouldDismissModal}
          buttonType={ButtonType.Secondary}
        />
      </View>
    </SafeAreaView>
  )
}

export default IASEnvironment
