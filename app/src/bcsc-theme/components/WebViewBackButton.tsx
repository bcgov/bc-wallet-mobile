import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { BCSCMainStackParams, BCSCVerifyStackParams } from '../types/navigators'

/**
 * Creates a custom back button for Main stack webview headers.
 */
export const createMainWebviewHeaderBackButton = () => {
  const MainHeaderLeft = (props: HeaderBackButtonProps) => {
    const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
    const handleBackPress = async () => {
      navigation.goBack()
    }

    return <HeaderBackButton {...props} onPress={handleBackPress} />
  }
  return MainHeaderLeft
}

/**
 * Creates a custom back button for Verify stack webview headers.
 */
export const createVerifyWebviewHeaderBackButton = () => {
  const VerifyHeaderLeft = (props: HeaderBackButtonProps) => {
    const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
    const handleBackPress = async () => {
      navigation.goBack()
    }

    return <HeaderBackButton {...props} onPress={handleBackPress} />
  }
  return VerifyHeaderLeft
}
