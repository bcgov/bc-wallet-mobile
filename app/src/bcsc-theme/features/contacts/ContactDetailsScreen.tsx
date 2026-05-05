import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ScreenWrapper, ThemedText, getConnectionName, testIdWithKey, useStore, useTheme } from '@bifold/core'
import { useConnectionById } from '@bifold/react-hooks'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface ContactDetailsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.ContactDetails>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.ContactDetails>
}

interface ActionRowProps {
  icon: string
  label: string
  onPress: () => void
  testID: string
  destructive?: boolean
}

const ContactDetailsScreen = ({ navigation, route }: ContactDetailsScreenProps) => {
  const { connectionId } = route.params
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [store] = useStore()
  const connection = useConnectionById(connectionId)

  const name = useMemo(
    () => getConnectionName(connection, store.preferences.alternateContactNames),
    [connection, store.preferences.alternateContactNames]
  )

  const connectedAt = useMemo(() => {
    if (!connection?.createdAt) {
      return ''
    }
    return new Date(connection.createdAt).toLocaleString()
  }, [connection?.createdAt])

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    name: {
      color: ColorPalette.brand.primary,
      flex: 1,
    },
    connectedAt: {
      color: ColorPalette.grayscale.mediumGrey,
      marginBottom: Spacing.lg,
    },
    actionGroup: {
      borderTopColor: ColorPalette.grayscale.lightGrey,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      gap: Spacing.md,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
  })

  const ActionRow: React.FC<ActionRowProps> = ({ icon, label, onPress, testID, destructive }) => {
    const color = destructive ? ColorPalette.semantic.error : ColorPalette.brand.text
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        style={styles.actionRow}
      >
        <Icon name={icon} size={22} color={color} />
        <ThemedText style={{ color }}>{label}</ThemedText>
      </Pressable>
    )
  }

  const onUnpin = useCallback(() => {
    // TODO: pin state requires a local store extension; placeholder for now.
  }, [])

  const onEditName = useCallback(() => {
    navigation.navigate(BCSCScreens.EditContactName, { connectionId })
  }, [navigation, connectionId])

  const onViewHistory = useCallback(() => {
    // History view is not built yet; route to JSON details as a stand-in.
    const blob = JSON.stringify(connection?.toJSON?.() ?? connection ?? {}, null, 2)
    navigation.navigate(BCSCScreens.ContactJSONDetails, {
      jsonBlob: blob,
      title: t('BCSC.Contacts.Details.ViewHistory'),
    })
  }, [connection, navigation, t])

  const onViewJSON = useCallback(() => {
    const blob = JSON.stringify(connection?.toJSON?.() ?? connection ?? {}, null, 2)
    navigation.navigate(BCSCScreens.ContactJSONDetails, { jsonBlob: blob })
  }, [connection, navigation])

  const onRemove = useCallback(() => {
    navigation.navigate(BCSCScreens.RemoveContact, { connectionId })
  }, [navigation, connectionId])

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Icon name="apartment" size={22} color={ColorPalette.brand.primary} />
        <ThemedText variant="headingThree" style={styles.name} numberOfLines={2}>
          {name}
        </ThemedText>
      </View>
      {connectedAt ? (
        <ThemedText style={styles.connectedAt}>
          {t('BCSC.Contacts.Details.ConnectedAt', { date: connectedAt })}
        </ThemedText>
      ) : null}

      <View style={styles.actionGroup}>
        <ActionRow
          icon="push-pin"
          label={t('BCSC.Contacts.Details.UnpinContact')}
          onPress={onUnpin}
          testID={testIdWithKey('UnpinContact')}
        />
        <ActionRow
          icon="edit"
          label={t('BCSC.Contacts.Details.EditName')}
          onPress={onEditName}
          testID={testIdWithKey('EditContactName')}
        />
        <ActionRow
          icon="history"
          label={t('BCSC.Contacts.Details.ViewHistory')}
          onPress={onViewHistory}
          testID={testIdWithKey('ViewHistory')}
        />
        <ActionRow
          icon="data-object"
          label={t('BCSC.Contacts.Details.ViewJSON')}
          onPress={onViewJSON}
          testID={testIdWithKey('ViewJSON')}
        />
        <ActionRow
          icon="delete-outline"
          label={t('BCSC.Contacts.Details.RemoveContact')}
          onPress={onRemove}
          testID={testIdWithKey('RemoveContact')}
          destructive
        />
      </View>
    </ScreenWrapper>
  )
}

export default ContactDetailsScreen
