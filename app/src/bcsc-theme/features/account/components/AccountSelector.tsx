import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useStore, useTheme, ThemedText } from '@bifold/core'
import { BCDispatchAction, BCState } from '@/store'
import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { CardButton } from '@/bcsc-theme/components/CardButton'

const AccountSelector: React.FC = () => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contentContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsContainer: {
      flex: 1,
      marginTop: 'auto',
      width: '100%',
      gap: Spacing.sm,
    },
  })

  const handleAccountSelect = useCallback(
    (nickname: string) => {
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [nickname] })
    },
    [dispatch]
  )

  return (
    <View style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <GenericCardImage />

        <ThemedText variant={'headingThree'}>{t('Unified.AccountSelector.Title')}</ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <View style={{ marginBottom: Spacing.md }}>
          <ThemedText variant={'headingFour'}>{t('Unified.AccountSelector.ContinueAs')}</ThemedText>
        </View>

        <View style={{ gap: Spacing.sm }}>
          {Array.from(store.bcsc.nicknames).map((nickname) => (
            <CardButton key={nickname} title={nickname} onPress={() => handleAccountSelect(nickname)} />
          ))}
        </View>
      </View>
    </View>
  )
}

export default AccountSelector
