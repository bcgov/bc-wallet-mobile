import { formatTime, getConnectionName, ThemedText, useStore, useTheme } from '@bifold/core'
import { DidCommConnectionRecord } from '@credo-ts/didcomm'
import React, { useMemo } from 'react'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'

interface ContactRowProps {
  contact: DidCommConnectionRecord
  subtitle?: string
  onPress: () => void
}

const ContactRow: React.FC<ContactRowProps> = ({ contact, subtitle, onPress }) => {
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

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
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
    },
    body: {
      flex: 1,
      paddingRight: Spacing.sm,
    },
    name: {
      color: ColorPalette.brand.primary,
    },
    subtitle: {
      color: ColorPalette.grayscale.mediumGrey,
    },
    date: {
      color: ColorPalette.grayscale.mediumGrey,
      alignSelf: 'flex-start',
    },
  })

  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
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
        <ThemedText style={styles.date}>{dateLabel}</ThemedText>
      </View>
    </TouchableOpacity>
  )
}

export default ContactRow
