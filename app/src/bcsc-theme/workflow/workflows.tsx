import React from 'react'
import { WorkflowDefinition } from './types'
import { BCSCScreens } from '../types/navigators'
import HelpHeaderButton from '../components/HelpHeaderButton'

// Import existing screens
import SetupStepsScreen from '../features/verify/SetupStepsScreen'
import IdentitySelectionScreen from '../features/verify/IdentitySelectionScreen'
import VerificationMethodSelectionScreen from '../features/verify/VerificationMethodSelectionScreen'
import VerificationSuccessScreen from '../features/verify/VerificationSuccessScreen'

// Import test workflow
export { testWorkflow } from './testWorkflow'

/**
 * Wrapper component that adapts existing screens to work with the workflow engine
 */
const createScreenWrapper = (OriginalComponent: React.ComponentType<any>) => {
  return (props: any) => {
    const { onNext, onBack, updateContext, context, canGoBack, ...restProps } = props
    
    // For now, pass through the existing navigation prop
    // In the future, we could enhance this to intercept navigation calls
    return <OriginalComponent {...restProps} />
  }
}

/**
 * Example mini-workflow demonstrating the workflow engine capabilities
 * This shows a simplified identity verification flow with conditional steps
 */
export const exampleMiniWorkflow: WorkflowDefinition = {
  id: 'example-identity-verification',
  name: 'Example Identity Verification',
  startStepId: 'setup-steps',
  initialContext: {
    hasSerial: false,
    hasEmail: false,
    verificationType: null,
  },
  steps: [
    {
      id: 'setup-steps',
      component: createScreenWrapper(SetupStepsScreen),
      title: 'Setup Steps',
      headerOptions: {
        headerRight: HelpHeaderButton,
        headerLeft: () => null,
      },
      next: (context) => {
        // If user has completed setup, go to verification method selection
        if (context.hasSerial && context.hasEmail) {
          return 'verification-method'
        }
        // Otherwise go to identity selection
        return 'identity-selection'
      },
    },
    {
      id: 'identity-selection',
      component: createScreenWrapper(IdentitySelectionScreen),
      title: 'Choose Your ID',
      isOptional: false,
      next: (context) => {
        // After identity selection, update context and go to verification method
        return 'verification-method'
      },
    },
    {
      id: 'verification-method',
      component: createScreenWrapper(VerificationMethodSelectionScreen),
      title: 'Choose How to Verify',
      headerOptions: {
        headerRight: HelpHeaderButton,
      },
      // This step should be skipped if user hasn't completed prerequisites
      shouldSkip: (context) => {
        return !context.hasSerial || !context.hasEmail
      },
      next: 'verification-success',
    },
    {
      id: 'verification-success',
      component: createScreenWrapper(VerificationSuccessScreen),
      title: 'Verification Complete',
      headerOptions: {
        headerShown: false,
      },
      // This is the final step
      next: null,
    },
  ],
}

/**
 * Full identity verification workflow definition
 * This replaces the static stack navigator with a declarative workflow
 */
export const identityVerificationWorkflow: WorkflowDefinition = {
  id: 'identity-verification',
  name: 'Identity Verification',
  startStepId: BCSCScreens.SetupSteps,
  initialContext: {},
  steps: [
    {
      id: BCSCScreens.SetupSteps,
      component: createScreenWrapper(SetupStepsScreen),
      title: 'Setup Steps',
      headerOptions: {
        headerRight: HelpHeaderButton,
        headerLeft: () => null,
      },
      next: BCSCScreens.IdentitySelection,
    },
    {
      id: BCSCScreens.IdentitySelection,
      component: createScreenWrapper(IdentitySelectionScreen),
      title: 'Choose Your ID',
      next: BCSCScreens.VerificationMethodSelection,
    },
    {
      id: BCSCScreens.VerificationMethodSelection,
      component: createScreenWrapper(VerificationMethodSelectionScreen),
      title: 'Choose How to Verify',
      headerOptions: {
        headerRight: HelpHeaderButton,
      },
      next: BCSCScreens.VerificationSuccess,
    },
    {
      id: BCSCScreens.VerificationSuccess,
      component: createScreenWrapper(VerificationSuccessScreen),
      title: 'Verification Complete',
      headerOptions: {
        headerShown: false,
      },
      next: null,
    },
  ],
}