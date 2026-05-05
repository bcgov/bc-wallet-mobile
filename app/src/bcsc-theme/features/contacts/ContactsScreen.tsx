import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import ContactsIllustration from '@assets/img/contacts.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { useConnections } from '@bifold/react-hooks'
import { DidCommConnectionRecord, DidCommConnectionType, DidCommDidExchangeState } from '@credo-ts/didcomm'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, TextInput, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import ContactRow from './ContactRow'

interface ContactsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.Contacts>
}

const ContactsScreen = ({ navigation }: ContactsScreenProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { records: connectionRecords } = useConnections()
  const [store] = useStore()
  const [query, setQuery] = useState('')

  const visibleContacts = useMemo<DidCommConnectionRecord[]>(() => {
    return connectionRecords
      .filter(
        (r) =>
          r.state === DidCommDidExchangeState.Completed && !r.connectionTypes.includes(DidCommConnectionType.Mediator)
      )
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).valueOf() - new Date(a.updatedAt ?? a.createdAt).valueOf())
  }, [connectionRecords])

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

  const styles = StyleSheet.create({
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ColorPalette.grayscale.lightGrey,
      borderRadius: Spacing.sm,
      paddingHorizontal: Spacing.md,
      marginHorizontal: Spacing.md,
      marginVertical: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.sm,
      marginLeft: Spacing.sm,
      color: ColorPalette.brand.text,
      fontSize: 16,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: ColorPalette.grayscale.lightGrey,
      marginHorizontal: Spacing.md,
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
        <Icon name="search" size={20} color={ColorPalette.grayscale.mediumGrey} />
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <ContactRow contact={item} onPress={() => onPressContact(item.id)} />}
      />
    </View>
  )
}

export default ContactsScreen
