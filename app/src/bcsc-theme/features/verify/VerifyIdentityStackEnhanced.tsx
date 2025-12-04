import React from 'react'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { WorkflowEngine, identityVerificationWorkflow } from '@/bcsc-theme/workflow'

// Import existing screen components (keeping original implementation)
import SetupStepsScreen from './SetupStepsScreen'
import HelpHeaderButton from '@/bcsc-theme/components/HelpHeaderButton'
import IdentitySelectionScreen from './IdentitySelectionScreen'
import SerialInstructionsScreen from './SerialInstructionsScreen'
import ManualSerialScreen from './ManualSerialScreen'
import ScanSerialScreen from './ScanSerialScreen'
import EnterBirthdateScreen from './EnterBirthdateScreen'
import VerificationMethodSelectionScreen from './VerificationMethodSelectionScreen'
import VerifyInPersonScreen from './in-person/VerifyInPersonScreen'
import MismatchedSerialScreen from './MismatchedSerialScreen'
import VerificationSuccessScreen from './VerificationSuccessScreen'
import InformationRequiredScreen from './send-video/InformationRequiredScreen'
import PhotoInstructionsScreen from './send-video/PhotoInstructionsScreen'
import TakePhotoScreen from './send-video/TakePhotoScreen'
import PhotoReviewScreen from './send-video/PhotoReviewScreen'
import TakeVideoScreen from './send-video/TakeVideoScreen'
import VideoInstructionsScreen from './send-video/VideoInstructionsScreen'
import VideoReviewScreen from './send-video/VideoReviewScreen'
import VideoTooLongScreen from './send-video/VideoTooLongScreen'
import PendingReviewScreen from './send-video/PendingReviewScreen'
import SuccessfullySentScreen from './send-video/SuccessfullySentScreen'
import EnterEmailScreen from './email/EnterEmailScreen'
import EmailConfirmationScreen from './email/EmailConfirmationScreen'

// Demo component for the new workflow engine
import WorkflowEngineDemo from './WorkflowEngineDemo'

/**
 * Enhanced VerifyIdentityStack with optional workflow engine integration
 * 
 * This component demonstrates how the existing static stack navigator
 * can coexist with the new declarative workflow engine.
 * 
 * Features:
 * - Maintains full backward compatibility with existing implementation
 * - Adds new workflow engine demo route to showcase functionality
 * - Provides migration path for gradual adoption
 * - Zero breaking changes to existing flows
 */
const VerifyIdentityStack = () => {
  const Stack = createStackNavigator<BCSCVerifyIdentityStackParams & {
    // Add new workflow demo route
    WorkflowDemo: undefined
  }>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions, headerShown: true, title: '' }}>
      {/* 
        EXISTING IMPLEMENTATION - UNCHANGED
        All original screens remain exactly as they were for backward compatibility 
      */}
      <Stack.Screen
        name={BCSCScreens.SetupSteps}
        component={SetupStepsScreen}
        options={{
          title: 'Setup Steps',
          headerRight: HelpHeaderButton,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name={BCSCScreens.IdentitySelection} component={IdentitySelectionScreen} />
      <Stack.Screen name={BCSCScreens.SerialInstructions} component={SerialInstructionsScreen} />
      <Stack.Screen name={BCSCScreens.ManualSerial} component={ManualSerialScreen} />
      <Stack.Screen name={BCSCScreens.ScanSerial} component={ScanSerialScreen} />
      <Stack.Screen name={BCSCScreens.EnterBirthdate} component={EnterBirthdateScreen} />
      <Stack.Screen name={BCSCScreens.MismatchedSerial} component={MismatchedSerialScreen} />
      <Stack.Screen name={BCSCScreens.EnterEmailScreen} component={EnterEmailScreen} />
      <Stack.Screen name={BCSCScreens.EmailConfirmationScreen} component={EmailConfirmationScreen} />
      <Stack.Screen
        name={BCSCScreens.VerificationMethodSelection}
        component={VerificationMethodSelectionScreen}
        options={{ title: 'Choose How to Verify', headerRight: HelpHeaderButton }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyInPerson}
        component={VerifyInPersonScreen}
        options={{ headerRight: HelpHeaderButton }}
      />
      <Stack.Screen
        name={BCSCScreens.InformationRequired}
        component={InformationRequiredScreen}
        options={{ title: 'Information Required' }}
      />
      <Stack.Screen name={BCSCScreens.PhotoInstructions} component={PhotoInstructionsScreen} />
      <Stack.Screen name={BCSCScreens.TakePhoto} component={TakePhotoScreen} options={{ headerShown: false }} />
      <Stack.Screen name={BCSCScreens.PhotoReview} component={PhotoReviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name={BCSCScreens.VideoInstructions} component={VideoInstructionsScreen} />
      <Stack.Screen name={BCSCScreens.TakeVideo} component={TakeVideoScreen} options={{ headerShown: false }} />
      <Stack.Screen name={BCSCScreens.VideoReview} component={VideoReviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name={BCSCScreens.PendingReview} component={PendingReviewScreen} />
      <Stack.Screen name={BCSCScreens.VideoTooLong} component={VideoTooLongScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={BCSCScreens.SuccessfullySent}
        component={SuccessfullySentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={BCSCScreens.VerificationSuccess}
        component={VerificationSuccessScreen}
        options={{ headerShown: false }}
      />

      {/* 
        NEW WORKFLOW ENGINE DEMO ROUTE
        This demonstrates the declarative workflow engine in action
        while maintaining compatibility with existing flows
      */}
      <Stack.Screen
        name={'WorkflowDemo' as any}
        component={WorkflowEngineDemo}
        options={{
          title: 'Workflow Engine Demo',
          headerRight: HelpHeaderButton,
        }}
      />
    </Stack.Navigator>
  )
}

/**
 * Alternative implementation using pure workflow engine
 * 
 * This shows how the entire stack could be replaced with the workflow engine
 * when ready for full migration (commented out for now)
 */
const VerifyIdentityWorkflowStack = () => {
  return <WorkflowEngine workflow={identityVerificationWorkflow} />
}

export default VerifyIdentityStack

// Export alternative implementation for future migration
export { VerifyIdentityWorkflowStack }