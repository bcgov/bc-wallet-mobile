import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
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
import AdditionalIdentificationRequiredScreen from './non-photo/AdditionalIdentificationRequiredScreen'
import IDPhotoInformationScreen from './non-photo/IDPhotoInformationScreen'
import EvidenceTypeListScreen from './non-photo/EvidenceTypeListScreen'
import EvidenceCaptureScreen from './non-photo/EvidenceCaptureScreen'
import EvidenceIDCollectionScreen from './non-photo/EvidenceIDCollectionScreen'

const VerifyIdentityStack = () => {
  const Stack = createStackNavigator<BCSCVerifyIdentityStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions, headerShown: true, title: '' }}>
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
      <Stack.Screen
        name={BCSCScreens.AdditionalIdentificationRequired}
        component={AdditionalIdentificationRequiredScreen}
      />
      <Stack.Screen name={BCSCScreens.IDPhotoInformation} component={IDPhotoInformationScreen} />
      <Stack.Screen name={BCSCScreens.EvidenceTypeList} component={EvidenceTypeListScreen} />
      <Stack.Screen name={BCSCScreens.EvidenceCapture} component={EvidenceCaptureScreen} />
      <Stack.Screen name={BCSCScreens.EvidenceIDCollection} component={EvidenceIDCollectionScreen} />
    </Stack.Navigator>
  )
}

export default VerifyIdentityStack
