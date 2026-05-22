import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Link, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface WhatAreContactsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.WhatAreContacts>
}

/**
 * Informational screen explaining what contacts are and how they're created in
 * the BC Wallet. Reached from the empty state and the contacts list header.
 */
const WhatAreContactsScreen = ({ navigation }: WhatAreContactsScreenProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const onPressContactsList = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const styles = StyleSheet.create({
    bulletRow: {
      flexDirection: 'row',
      paddingLeft: Spacing.sm,
    },
    bulletGlyph: {
      marginRight: Spacing.sm,
    },
    bulletText: {
      flex: 1,
    },
  })

  const bullets = [
    t('BCSC.Contacts.WhatAre.Bullet1'),
    t('BCSC.Contacts.WhatAre.Bullet2'),
    t('BCSC.Contacts.WhatAre.Bullet3'),
    t('BCSC.Contacts.WhatAre.Bullet4'),
  ]

  return (
    <ScreenWrapper scrollViewContainerStyle={{ gap: Spacing.lg, padding: Spacing.lg }}>
      <ThemedText variant="headingTwo" style={{ color: ColorPalette.brand.primary }}>
        {t('BCSC.Contacts.WhatAre.Title')}
      </ThemedText>
      <ThemedText>{t('BCSC.Contacts.WhatAre.Description1')}</ThemedText>
      <ThemedText>{t('BCSC.Contacts.WhatAre.Description2')}</ThemedText>

      <View>
        <ThemedText variant="bold">{t('BCSC.Contacts.WhatAre.YouCanHeader')}</ThemedText>
        {bullets.map((line) => (
          <View key={line} style={styles.bulletRow}>
            <ThemedText style={styles.bulletGlyph}>{'•'}</ThemedText>
            <ThemedText style={styles.bulletText}>{line}</ThemedText>
          </View>
        ))}
      </View>

      <ThemedText style={{ marginTop: Spacing.lg }}>
        {t('BCSC.Contacts.WhatAre.FooterPrefix')}
        <Link
          testID={testIdWithKey('ContactsList')}
          linkText={t('BCSC.Contacts.WhatAre.FooterLink')}
          onPress={onPressContactsList}
        />
        {t('BCSC.Contacts.WhatAre.FooterSuffix')}
      </ThemedText>
    </ScreenWrapper>
  )
}

export default WhatAreContactsScreen
