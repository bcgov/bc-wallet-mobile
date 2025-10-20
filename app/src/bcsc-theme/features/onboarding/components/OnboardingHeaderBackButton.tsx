import { useWorkflowEngine } from '@/contexts/WorkflowEngineContext'
import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import React from 'react'

/**
 * Creates a custom back button for onboarding headers that navigates to the previous step in the workflow.
 *
 * Note: This is a curried function to avoid re-rendering in navigation stacks.
 *
 */
export const createOnboardingHeaderBackButton = () => {
  // Declared so that it has a display name for debugging purposes
  const HeaderLeft = (props: HeaderBackButtonProps) => {
    const workflowEngine = useWorkflowEngine()

    return (
      <HeaderBackButton
        {...props}
        onPress={() => {
          workflowEngine.previousStep()
        }}
      />
    )
  }
  return HeaderLeft
}
