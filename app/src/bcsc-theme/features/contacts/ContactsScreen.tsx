import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import ContactsIllustration from '@assets/img/contacts.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { useConnections } from '@bifold/react-hooks'
import { DidCommConnectionRecord, DidCommConnectionType, DidCommDidExchangeState } from '@credo-ts/didcomm'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ColorValue, FlatList, StyleSheet, TextInput, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import ContactRow from './ContactRow'
import { usePinnedContacts } from './services/usePinnedContacts'

interface ContactsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.Contacts>
}

interface ContactListSeparatorProps {
  backgroundColor: ColorValue
}

const ContactListSeparator: React.FC<ContactListSeparatorProps> = ({ backgroundColor }) => (
  <View style={{ height: 1, backgroundColor }} />
)

const createContactListSeparator = (backgroundColor: ColorValue) => {
  const Separator = () => <ContactListSeparator backgroundColor={backgroundColor} />
  return Separator
}

/**
 * Lists the user's DIDComm connections with search and per-contact pin
 * toggling. Pinned contacts appear first; remaining contacts are sorted by
 * most-recent activity.
 */
const ContactsScreen = ({ navigation }: ContactsScreenProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { records: connectionRecords } = useConnections()
  const [store] = useStore()
  const [query, setQuery] = useState('')
  const { isPinned, togglePin } = usePinnedContacts()

  const visibleContacts = useMemo<DidCommConnectionRecord[]>(() => {
    const recencyOf = (r: DidCommConnectionRecord) => new Date(r.updatedAt ?? r.createdAt).valueOf()
    return connectionRecords
      .filter(
        (r) =>
          r.state === DidCommDidExchangeState.Completed && !r.connectionTypes.includes(DidCommConnectionType.Mediator)
      )
      .sort((a, b) => {
        const pa = isPinned(a.id) ? 1 : 0
        const pb = isPinned(b.id) ? 1 : 0
        if (pa !== pb) {
          return pb - pa
        }
        return recencyOf(b) - recencyOf(a)
      })
  }, [connectionRecords, isPinned])

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return visibleContacts
    }
    const aliases = store.preferences.alternateContactNames
    return visibleContacts.filter((c) => {
      const name = (aliases?.[c.id] || c.theirLabel || c.alias || '').toLowerCase()
      return name.includes(q)
    })
  }, [visibleContacts, query, store.preferences.alternateContactNames])

  const onPressContact = useCallback(
    (connectionId: string) => {
      navigation.navigate(BCSCScreens.ContactDetails, { connectionId })
    },
    [navigation]
  )

  const onPressWhatAreContacts = useCallback(() => {
    navigation.navigate(BCSCScreens.WhatAreContacts)
  }, [navigation])

  const Separator = useMemo(
    () => createContactListSeparator(ColorPalette.brand.secondaryBackground),
    [ColorPalette.brand.secondaryBackground]
  )

  const styles = StyleSheet.create({
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ColorPalette.brand.secondaryBackground,
      borderWidth: 1,
      borderColor: ColorPalette.grayscale.mediumGrey,
      borderRadius: 8,
      paddingHorizontal: Spacing.md,
      marginHorizontal: Spacing.md,
      marginVertical: Spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.md,
      marginLeft: Spacing.sm,
      color: ColorPalette.brand.text,
      fontSize: 16,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
      gap: Spacing.lg,
    },
    emptyButton: {
      width: '100%',
    },
  })

  if (visibleContacts.length === 0) {
    return (
      <ScreenWrapper padded={false} scrollViewContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.empty}>
          <ContactsIllustration />
          <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
            {t('BCSC.Contacts.EmptyTitle')}
          </ThemedText>
          <View style={styles.emptyButton}>
            <Button
              buttonType={ButtonType.Primary}
              title={t('BCSC.Contacts.WhatAreContactsButton')}
              onPress={onPressWhatAreContacts}
              accessibilityLabel={t('BCSC.Contacts.WhatAreContactsButton')}
              testID={testIdWithKey('WhatAreContacts')}
            />
          </View>
        </View>
      </ScreenWrapper>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={ColorPalette.brand.primary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('BCSC.Contacts.SearchPlaceholder')}
          placeholderTextColor={ColorPalette.grayscale.mediumGrey}
          accessibilityLabel={t('BCSC.Contacts.SearchPlaceholder')}
          testID={testIdWithKey('SearchContacts')}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={filteredContacts}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <ContactRow
            contact={item}
            pinned={isPinned(item.id)}
            onPress={() => onPressContact(item.id)}
            onLongPress={() => togglePin(item.id)}
          />
        )}
      />
    </View>
  )
}

export default ContactsScreen
