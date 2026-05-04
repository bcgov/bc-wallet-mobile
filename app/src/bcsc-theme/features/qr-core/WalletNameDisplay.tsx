import { ButtonLocation, IconButton, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { BCSCAuthStackParams, BCSCScreens } from '../../types/navigators'

type AuthNavigation = StackNavigationProp<BCSCAuthStackParams>

const WalletNameDisplay: React.FC = () => {
  const [store] = useStore()
  const { TextTheme } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<AuthNavigation>()

  const handleEdit = useCallback(() => {
    navigation.navigate(BCSCScreens.AuthRenameWallet)
  }, [navigation])

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    name: {
      textAlign: 'center',
      paddingHorizontal: 20,
    },
  })

  return (
    <View style={styles.container}>
      <ThemedText variant="headingTwo" testID={testIdWithKey('WalletName')} style={styles.name}>
        {store.preferences.walletName}
      </ThemedText>
      <IconButton
        buttonLocation={ButtonLocation.Right}
        accessibilityLabel={t('NameWallet.EditWalletName')}
        testID={testIdWithKey('EditWalletName')}
        onPress={handleEdit}
        icon="pencil"
        iconTintColor={TextTheme.headingTwo.color}
      />
    </View>
  )
}

export default WalletNameDisplay
