import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  DispatchAction,
  LimitedTextInput,
  ThemedText,
  getConnectionName,
  testIdWithKey,
  useStore,
  useTheme,
} from '@bifold/core'
import { useConnectionById } from '@bifold/react-hooks'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, View } from 'react-native'

interface EditContactNameScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.EditContactName>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.EditContactName>
}

const NAME_MAX = 50

/**
 * Renames a DIDComm contact by writing to `preferences.alternateContactNames`.
 * Enforces a 50-character maximum and trims whitespace on save.
 */
const EditContactNameScreen = ({ navigation, route }: EditContactNameScreenProps) => {
  const { connectionId } = route.params
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [store, dispatch] = useStore()
  const connection = useConnectionById(connectionId)
  const [name, setName] = useState(getConnectionName(connection, store.preferences.alternateContactNames))

  const onSave = useCallback(() => {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      Alert.alert(t('BCSC.Contacts.EditName.EmptyTitle'), t('BCSC.Contacts.EditName.EmptyDescription'))
      return
    }
    if (trimmed.length > NAME_MAX) {
      Alert.alert(t('BCSC.Contacts.EditName.TooLongTitle'), t('BCSC.Contacts.EditName.TooLongDescription'))
      return
    }
    dispatch({
      type: DispatchAction.UPDATE_ALTERNATE_CONTACT_NAMES,
      payload: [{ [connectionId]: trimmed }],
    })
    navigation.goBack()
  }, [connectionId, dispatch, name, navigation, t])

  return (
    <ActionScreenLayout
      primaryActionText={t('Global.Continue')}
      onPressPrimaryAction={onSave}
      secondaryActionText={t('Global.Cancel')}
      onPressSecondaryAction={() => navigation.goBack()}
    >
      <View style={{ padding: Spacing.md, gap: Spacing.md }}>
        <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
          {t('BCSC.Contacts.EditName.Title')}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.Contacts.EditName.Description')}</ThemedText>
        <View>
          <LimitedTextInput
            defaultValue={name}
            label={t('BCSC.Contacts.EditName.Label')}
            limit={NAME_MAX}
            handleChangeText={setName}
            accessibilityLabel={t('BCSC.Contacts.EditName.Label')}
            testID={testIdWithKey('NameInput')}
          />
        </View>
      </View>
    </ActionScreenLayout>
  )
}

export default EditContactNameScreen
