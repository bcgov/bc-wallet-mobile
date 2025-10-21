import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useStore, useTheme, testIdWithKey, Button, ButtonType, ThemedText, KeyboardView } from '@bifold/core'
import { BCDispatchAction, BCState } from '@/store'
import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'

const AccountSelector: React.FC = () => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
      paddingTop: Spacing.xl,
      width: '100%',
    },
    controlsContainer: {
      marginTop: 'auto',
    },
    accountButton: {
      marginBottom: Spacing.sm,
    },
  })

  const handleAccountSelect = useCallback(
    (index: number) => {
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [index] })
    },
    [dispatch]
  )

  return (
    <KeyboardView>
      <View style={styles.pageContainer}>
        <View style={styles.contentContainer}>
          <GenericCardImage />
          <View style={{ marginBottom: Spacing.md }} />
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            {t('Unified.AccountSelector.SelectAccount')}
          </ThemedText>

          <ThemedText style={{ marginBottom: Spacing.lg }}>
            {t('Unified.AccountSelector.SelectAccountDescription')}
          </ThemedText>

          {store.bcsc.nicknames.length > 0 ? (
            <>
              <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.md }}>
                {t('Unified.AccountSelector.ExistingAccounts')}
              </ThemedText>

              {Array.from(store.bcsc.nicknames).map((nickname, index) => (
                <Button
                  key={nickname}
                  title={nickname}
                  buttonType={ButtonType.Secondary}
                  testID={testIdWithKey(`Account-${index}`)}
                  accessibilityLabel={nickname}
                  onPress={() => handleAccountSelect(index)}
                />
              ))}
            </>
          ) : (
            <ThemedText style={{ marginBottom: Spacing.lg }}>{t('Unified.AccountSelector.NoAccountsFound')}</ThemedText>
          )}
        </View>
      </View>
    </KeyboardView>
  )
}

export default AccountSelector
