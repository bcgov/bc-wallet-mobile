import React from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { useWorkflow } from '@/contexts/WorkFlowContext'
import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'

type LoadingScreenProps = NativeStackScreenProps<BCSCVerifyIdentityStackParamList, BCSCScreens.Loading> & {
  message?: string
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, navigation, route }) => {
  const { nextStep, context, engine } = useWorkflow()
  const stepIndex = route.params?.stepIndex ?? 0
  useFocusEffect(() => {
    const executeStepLogic = async () => {
      console.log('LoadingScreen: stepIndex is', stepIndex)
      const step = engine.getStepByIndex(stepIndex)
      if (step?.condition && !step?.condition(context)) {
        return nextStep(navigation, stepIndex)
      }
      if (step?.handler) {
        await step.handler({ step, context })
        if (step.component) {
          navigation.replace(step.name as keyof BCSCVerifyIdentityStackParamList, {
            stepIndex: step.index as number,
          })
        } else {
          nextStep(navigation, stepIndex)
        }
      } else if (step?.component) {
        navigation.replace(step.name as keyof BCSCVerifyIdentityStackParamList, {
          stepIndex: step.index as number,
        })
      }
    }
    executeStepLogic()
  })
  return (
    <View>
      <ActivityIndicator size="large" color="#0000ff" />
      {message && <Text>{message}</Text>}
    </View>
  )
}
