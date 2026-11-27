import { AgentReadyGate } from '@/bcsc-theme/features/agent'
import { BCSCMainStackParams } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { ProofRequestStack, Stacks, testIdWithKey } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { BackHandler } from 'react-native'

type Props = StackScreenProps<BCSCMainStackParams, Stacks.ProofRequestsStack>

/**
 * Hosts Bifold's proof-request stack. The only route BCSC reaches in it is the credential picker
 * that a proof request's "Change credential" link opens (see BifoldNavigationAdapter).
 *
 * Bifold's Connection screen stays mounted underneath and blocks the Android back button for its
 * whole lifetime, so while the picker is in front, hardware back closes it like the header arrow.
 */
const ProofRequestStackScreen: React.FC<Props> = ({ navigation }) => {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.goBack()
        return true
      })

      return () => subscription.remove()
    }, [navigation])
  )

  return (
    <AgentReadyGate testID={testIdWithKey(TestIds.proof.changeCredential.loading)}>
      <ProofRequestStack />
    </AgentReadyGate>
  )
}

export default ProofRequestStackScreen
