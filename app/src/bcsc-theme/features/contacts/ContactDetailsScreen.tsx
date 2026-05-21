import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  ScreenWrapper,
  ThemedText,
  formatTime,
  getConnectionName,
  testIdWithKey,
  useStore,
  useTheme,
} from '@bifold/core'
import { useConnectionById } from '@bifold/react-hooks'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native'
import CommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { usePinnedContacts } from './services/usePinnedContacts'

interface ContactDetailsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.ContactDetails>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.ContactDetails>
}

interface ActionCardProps {
  icon: string
  label: string
  onPress: () => void
  testID: string
  iconColor: string
  cardStyle: StyleProp<ViewStyle>
  labelStyle: StyleProp<TextStyle>
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, label, onPress, testID, iconColor, cardStyle, labelStyle }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} style={cardStyle}>
    <CommunityIcon name={icon} size={22} color={iconColor} />
    <ThemedText style={labelStyle}>{label}</ThemedText>
  </Pressable>
)

/**
 * Detail screen for a DIDComm connection. Shows the contact's name, creation
 * timestamp, and pin state, and exposes actions to rename, view raw JSON,
 * remove, or toggle pinning.
 */
const ContactDetailsScreen = ({ navigation, route }: ContactDetailsScreenProps) => {
  const { connectionId } = route.params
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [store] = useStore()
  const connection = useConnectionById(connectionId)
  const { isPinned, togglePin } = usePinnedContacts()
  const pinned = isPinned(connectionId)

  const name = useMemo(
    () => getConnectionName(connection, store.preferences.alternateContactNames),
    [connection, store.preferences.alternateContactNames]
  )

  const connectedAt = useMemo(() => {
    if (!connection?.createdAt) {
      return ''
    }
    return formatTime(new Date(connection.createdAt), { includeHour: true })
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
      paddingLeft: Spacing.sm,
    },
    connectedAt: {
      color: ColorPalette.grayscale.black,
      marginBottom: Spacing.lg,
    },
    actionGroup: {
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ColorPalette.brand.primaryLight,
      borderRadius: 8,
      padding: Spacing.md,
      gap: Spacing.md,
    },
    actionLabel: {
      color: ColorPalette.brand.primary,
      flex: 1,
    },
    removeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      gap: Spacing.md,
    },
    removeLabel: {
      color: ColorPalette.semantic.error,
    },
  })

  const onTogglePin = useCallback(() => {
    togglePin(connectionId)
  }, [togglePin, connectionId])

  const onMessage = useCallback(() => {
    navigation.navigate(BCSCScreens.ContactChat, { connectionId })
  }, [navigation, connectionId])

  const onEditName = useCallback(() => {
    navigation.navigate(BCSCScreens.EditContactName, { connectionId })
  }, [navigation, connectionId])

  const onViewHistory = useCallback(() => {
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
    <ScreenWrapper scrollViewContainerStyle={{ padding: Spacing.lg }}>
      <View style={styles.header}>
        <Icon name="apartment" size={24} color={ColorPalette.brand.primary} />
        <ThemedText variant="headingThree" style={styles.name} numberOfLines={2}>
          {name}
        </ThemedText>
        {pinned ? <CommunityIcon name="pin" size={24} color={ColorPalette.brand.primary} /> : null}
      </View>
      {connectedAt ? (
        <ThemedText style={styles.connectedAt}>
          {t('BCSC.Contacts.Details.ConnectedAt', { date: connectedAt })}
        </ThemedText>
      ) : null}

      <View style={styles.actionGroup}>
        <ActionCard
          icon="message-text-outline"
          label={t('BCSC.Contacts.Details.Message')}
          onPress={onMessage}
          testID={testIdWithKey('MessageContact')}
          iconColor={ColorPalette.brand.primary}
          cardStyle={styles.actionCard}
          labelStyle={styles.actionLabel}
        />
        <ActionCard
          icon="pin"
          label={t(pinned ? 'BCSC.Contacts.Details.UnpinContact' : 'BCSC.Contacts.Details.PinContact')}
          onPress={onTogglePin}
          testID={testIdWithKey(pinned ? 'UnpinContact' : 'PinContact')}
          iconColor={ColorPalette.brand.primary}
          cardStyle={styles.actionCard}
          labelStyle={styles.actionLabel}
        />
        <ActionCard
          icon="pencil"
          label={t('BCSC.Contacts.Details.EditName')}
          onPress={onEditName}
          testID={testIdWithKey('EditContactName')}
          iconColor={ColorPalette.brand.primary}
          cardStyle={styles.actionCard}
          labelStyle={styles.actionLabel}
        />
        <ActionCard
          icon="history"
          label={t('BCSC.Contacts.Details.ViewHistory')}
          onPress={onViewHistory}
          testID={testIdWithKey('ViewHistory')}
          iconColor={ColorPalette.brand.primary}
          cardStyle={styles.actionCard}
          labelStyle={styles.actionLabel}
        />
        <ActionCard
          icon="code-braces"
          label={t('BCSC.Contacts.Details.ViewJSON')}
          onPress={onViewJSON}
          testID={testIdWithKey('ViewJSON')}
          iconColor={ColorPalette.brand.primary}
          cardStyle={styles.actionCard}
          labelStyle={styles.actionLabel}
        />
      </View>

      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t('BCSC.Contacts.Details.RemoveContact')}
        testID={testIdWithKey('RemoveContact')}
        style={styles.removeRow}
      >
        <CommunityIcon name="trash-can-outline" size={22} color={ColorPalette.semantic.error} />
        <ThemedText style={styles.removeLabel}>{t('BCSC.Contacts.Details.RemoveContact')}</ThemedText>
      </Pressable>
    </ScreenWrapper>
  )
}

export default ContactDetailsScreen
