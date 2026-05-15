import { formatTime, getConnectionName, ThemedText, useStore, useTheme } from '@bifold/core'
import { DidCommConnectionRecord } from '@credo-ts/didcomm'
import React, { useMemo } from 'react'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useContactSubtitle } from './useContactSubtitle'

interface ContactRowProps {
  contact: DidCommConnectionRecord
  pinned?: boolean
  onPress: () => void
  onLongPress?: () => void
}

const ContactRow: React.FC<ContactRowProps> = ({ contact, pinned, onPress, onLongPress }) => {
  const { ColorPalette, Spacing } = useTheme()
  const [store] = useStore()

  const name = useMemo(
    () => getConnectionName(contact, store.preferences.alternateContactNames),
    [contact, store.preferences.alternateContactNames]
  )
  const initial = useMemo(() => name.charAt(0).toUpperCase(), [name])
  const dateLabel = useMemo(
    () => formatTime(new Date(contact.updatedAt ?? contact.createdAt), { shortMonth: true, trim: true }),
    [contact.updatedAt, contact.createdAt]
  )
  const subtitle = useContactSubtitle(contact.id)

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: ColorPalette.brand.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: Spacing.md,
    },
    body: {
      flex: 1,
      paddingRight: Spacing.sm,
    },
    name: {
      color: ColorPalette.brand.primary,
    },
    subtitle: {
      color: ColorPalette.grayscale.black,
      marginTop: 2,
    },
    rightColumn: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      alignSelf: 'stretch',
      paddingVertical: 2,
    },
    date: {
      color: ColorPalette.brand.primary,
    },
  })

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: !!pinned }}
    >
      <View style={styles.row}>
        {contact.imageUrl ? (
          <Image style={styles.avatarImage} source={{ uri: contact.imageUrl }} />
        ) : (
          <View style={styles.avatar}>
            <ThemedText variant="bold" style={{ color: ColorPalette.brand.primary }}>
              {initial}
            </ThemedText>
          </View>
        )}
        <View style={styles.body}>
          <ThemedText variant="bold" style={styles.name} numberOfLines={1}>
            {name}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.rightColumn}>
          <ThemedText style={styles.date}>{dateLabel}</ThemedText>
          {pinned ? <Icon name="pin" size={20} color={ColorPalette.brand.primary} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default ContactRow
