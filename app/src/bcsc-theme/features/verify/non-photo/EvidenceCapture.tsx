import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { testIdWithKey, ThemedText, useStore, useTheme, useServices, TOKENS } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useEffect, useState, useRef } from 'react'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera'
import MaskedView from '@react-native-masked-view/masked-view'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { StyleSheet, View, Text, Alert, TouchableOpacity, useWindowDimensions } from 'react-native'

type EvidenceCaptureScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EvidenceCapture>
  route: { params: { cardType: EvidenceType } }
}

// This should act like a controller, so I'll need to create a new camera component, that will pass in the props like:
// camera direction and mask?
// then the controller will handle what to do with the
// this should be replaced by the workflow components
const EvidenceCaptureScreen: React.FC<EvidenceCaptureScreenProps> = ({
  navigation,
  route,
}: EvidenceCaptureScreenProps) => {
  const { cardType } = route.params
  console.log('EVIDENCE COLLECTION CONTROLLER')
  console.log(cardType)
  // const [imagesSides, setImageSides] = useState<any[] | undefined>(undefined)

  // useEffect(() => {
  //   if (imagesSides === undefined) {
  //     setImageSides(cardType.image_sides)
  //   } else if (imagesSides.length > 0) {

  //   } else {

  //   }
  // }, [cardType])

  return <SafeAreaView style={{ flex: 1, position: 'relative' }}></SafeAreaView>
}

export default EvidenceCaptureScreen
