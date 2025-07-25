import React, { useEffect, useMemo } from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { useDefaultStackOptions, useTheme } from '@bifold/core'
import { WorkflowDefinition, WorkflowStep as WorkflowStepType } from './types'
import { WorkflowProvider, useWorkflow } from './WorkflowContext'

/**
 * Props for a workflow step component
 */
export interface WorkflowStepProps {
  onNext: () => void
  onBack: () => void
  updateContext: (updates: any) => void
  context: any
  canGoBack: boolean
}

/**
 * Higher-order component that wraps a workflow step with navigation capabilities
 */
const WorkflowStepWrapper: React.FC<{
  step: WorkflowStepType
  navigation: any
  route: any
}> = ({ step, navigation, route }) => {
  const { navigateToNextStep, updateContext, state, canGoBack, dispatch } = useWorkflow()

  const handleNext = () => {
    const nextStepId = getNextStepId()
    if (nextStepId) {
      navigation.navigate(nextStepId)
    } else {
      dispatch({ type: 'COMPLETE_WORKFLOW' })
    }
  }

  const getNextStepId = () => {
    if (typeof step.next === 'string') {
      return step.next
    } else if (typeof step.next === 'function') {
      return step.next(state.context)
    }
    return null
  }

  const handleBack = () => {
    if (canGoBack()) {
      navigation.goBack()
    }
  }

  const StepComponent = step.component

  // Update workflow context when this step becomes active
  useEffect(() => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step.id })
  }, [step.id, dispatch])

  return (
    <StepComponent
      onNext={handleNext}
      onBack={handleBack}
      updateContext={updateContext}
      context={state.context}
      canGoBack={canGoBack()}
      navigation={navigation}
      route={route}
    />
  )
}

/**
 * Core workflow engine component that manages the stack navigator
 */
const WorkflowEngineCore: React.FC<{
  workflow: WorkflowDefinition
}> = ({ workflow }) => {
  const Stack = createStackNavigator()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const { state, dispatch } = useWorkflow()

  // Initialize workflow when component mounts
  useEffect(() => {
    dispatch({ type: 'INITIALIZE_WORKFLOW', payload: workflow })
  }, [workflow, dispatch])

  // All steps are rendered in the navigator, but conditional logic
  // is handled in the workflow wrapper and step navigation
  const steps = workflow.steps

  return (
    <Stack.Navigator 
      screenOptions={{ 
        ...defaultStackOptions, 
        headerShown: true, 
        title: '' 
      }}
      initialRouteName={workflow.startStepId}
    >
      {steps.map((step) => (
        <Stack.Screen
          key={step.id}
          name={step.id}
          options={{
            title: step.title || '',
            ...step.headerOptions,
          }}
        >
          {({ navigation, route }) => (
            <WorkflowStepWrapper 
              step={step} 
              navigation={navigation}
              route={route}
            />
          )}
        </Stack.Screen>
      ))}
    </Stack.Navigator>
  )
}

/**
 * Main WorkflowEngine component with provider wrapper
 */
export const WorkflowEngine: React.FC<{
  workflow: WorkflowDefinition
}> = ({ workflow }) => {
  return (
    <WorkflowProvider>
      <WorkflowEngineCore workflow={workflow} />
    </WorkflowProvider>
  )
}

export default WorkflowEngine