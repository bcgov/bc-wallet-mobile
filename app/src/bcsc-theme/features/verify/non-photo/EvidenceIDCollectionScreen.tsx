import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { Button, ButtonType, Text, ThemedText, useStore, useTheme } from '@bifold/core'
import { TextInput, View } from 'react-native'
import { BCDispatchAction, BCState } from '@/store'
import { CommonActions } from '@react-navigation/native'

type EvidenceIDCollectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EvidenceIDCollection>
  route: { params: { cardType: EvidenceType } }
}

const EvidenceIDCollectionScreen = ({ navigation, route }: EvidenceIDCollectionScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const { Inputs } = useTheme()
  const { cardType } = route.params

  const [currentDocumentNumber, setCurrentDocumentNumber] = useState('')

  const handleOnContinue = async () => {
    dispatch({
      type: BCDispatchAction.UPDATE_EVIDENCE_DOCUMENT_NUMBER,
      payload: [{ evidenceType: route.params.cardType, documentNumber: currentDocumentNumber }],
    })

    const hasPhotoEvidence = store.bcsc.additionalEvidenceData.some((item) => {
      return item.evidenceType.has_photo
    })

    if (hasPhotoEvidence) {
      // we have photo evidence available, take the user back to the setup steps
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
    } else {
      // if no photo evidence is required, navigate back to the evidence list screen
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.EvidenceTypeList }],
        })
      )
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <ThemedText variant={'headingOne'}>{cardType.evidence_type_label}</ThemedText>
      <ThemedText style={{ paddingVertical: 16 }}>
        Enter the information <Text style={{ fontWeight: 'bold' }}>{'exactly as shown'}</Text> on the ID.
      </ThemedText>
      <View style={{ marginVertical: 10, width: '100%' }}>
        <ThemedText variant={'labelTitle'} style={{ marginBottom: 8 }}>
          {cardType.document_reference_label}
        </ThemedText>
        <TextInput
          style={{ ...Inputs.textInput }}
          onChange={(e) => {
            // TODO: needs to account for regex validated
            setCurrentDocumentNumber(e.nativeEvent.text)
          }}
        />
        <ThemedText
          style={{ marginTop: 8 }}
          variant={'labelSubtitle'}
        >{`For example: ${cardType.document_reference_sample}`}</ThemedText>
      </View>
      <View style={{ marginTop: 48, width: '100%' }}>
        <View style={{ marginBottom: 20 }}>
          <Button
            title="Continue"
            accessibilityLabel={'Continue'}
            testID={''}
            buttonType={ButtonType.Primary}
            onPress={handleOnContinue}
          />
        </View>
        <Button
          title="Cancel"
          accessibilityLabel={'Cancel'}
          testID={''}
          buttonType={ButtonType.Secondary}
          onPress={() => navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  )
}

export default EvidenceIDCollectionScreen
