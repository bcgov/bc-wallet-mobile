import client from '@/bcsc-theme/api/client'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCRootStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { BrandColors } from '@/bcwallet-theme/theme'
import { BCState } from '@/store'
import { ThemedText, TOKENS, useServices, useStore, useTheme, Button, ButtonType } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { set } from 'mockdate'
import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'


type AccountNavigationProp = StackNavigationProp<BCSCRootStackParams>

const RemoveAccountConfirmationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { user } = useApi()
  const navigation = useNavigation<AccountNavigationProp>()
  const [loading, setLoading] = useState(true)

  const [logger] = useServices([TOKENS.UTIL_LOGGER])


  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
    //   backgroundColor: BrandColors.primaryBackground,
      flex: 1,
    },
    buttonsContainer: {
      gap: Spacing.md,
      marginTop: Spacing.lg,
    },
    textContainer: {
        marginBottom: Spacing.md,
    }
  })

  const handleRemoveAccount = () => {
    console.log('Not implemented')
  }

  return (
    <View style={styles.container}>
        <View style={styles.textContainer}>
            <ThemedText variant={'headingThree'}>{'Remove account From this app?'}</ThemedText>
            <ThemedText>{'To use this app again, you\'ll need to provide your ID and verify your identity'}</ThemedText>
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            buttonType={ButtonType.Critical}
            title={'Remove Account'} onPress={handleRemoveAccount} />
          <Button
            buttonType={ButtonType.Secondary}
            title={'Cancel'} onPress={() => navigation.goBack()} />
        </View>
      </View>
  )
}

export default RemoveAccountConfirmationScreen
