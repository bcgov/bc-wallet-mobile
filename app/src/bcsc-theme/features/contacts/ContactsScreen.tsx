import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import Contacts from '@assets/img/contacts.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface ContactsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.Contacts>
}

const ContactsScreen = ({ navigation }: ContactsScreenProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const onPressWhatAreContacts = useCallback(() => {
    navigation.navigate(BCSCScreens.WhatAreContacts)
  }, [navigation])

  const styles = StyleSheet.create({
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
      gap: Spacing.lg,
    },
    button: {
      width: '100%',
    },
  })

  return (
    <ScreenWrapper padded={false} scrollViewContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.content}>
        <Contacts />
        <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
          {t('BCSC.Contacts.EmptyTitle')}
        </ThemedText>
        <View style={styles.button}>
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

export default ContactsScreen
