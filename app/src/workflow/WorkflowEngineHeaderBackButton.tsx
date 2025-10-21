import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import React from 'react'
import { useWorkflowEngine } from './useWorkflowEngine'

/**
 * Creates a custom back button for workflow engine headers that navigates to the previous step in the workflow.
 *
 * Note: This is a curried function to avoid re-rendering in navigation stacks.
 *
 */
export const createWorkflowEngineBackHeaderButton = () => {
  // Declared so that it has a display name for debugging purposes
  const HeaderLeft = (props: HeaderBackButtonProps) => {
    const workflowEngine = useWorkflowEngine()

    return (
      <HeaderBackButton
        {...props}
        onPress={() => {
          if (workflowEngine.currentStep.previousStep == null) {
            throw new Error('No previous step defined in the workflow.')
          }

          workflowEngine.goToStep(workflowEngine.currentStep.previousStep)
        }}
      />
    )
  }
  return HeaderLeft
}
