import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import RectangularMask from '@/bcsc-theme/components/RectangularMask'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { Button, ButtonType, Text, ThemedText, useStore, useTheme } from '@bifold/core'
import { TextInput, View } from 'react-native'
import { BCSCState, BCState } from '@/store'
import useApi from '@/bcsc-theme/api/hooks/useApi'

type EvidenceIDCollectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EvidenceIDCollection>
  route: { params: { cardType: EvidenceType } }
}

const EvidenceIDCollectionScreen = ({ navigation, route }: EvidenceIDCollectionScreenProps) => {
  const [store] = useStore<BCState>()
  const { Inputs } = useTheme()
  const { evidence } = useApi()
  const { cardType } = route.params

  const [currentDocumentNumber, setCurrentDocumentNumber] = useState('')

  const handleOnContinue = async () => {
    console.log('ARE WE READY TO GO OR WHAT...')
    console.log(JSON.stringify(store.bcsc.evidenceMetadata, null, 2))

    if (store.bcsc.evidenceMetadata) {
      const evidenceMetadata = store.bcsc.evidenceMetadata
      const response = await evidence.sendEvidenceMetadata({
        type: cardType.evidence_type,
        number: currentDocumentNumber,
        images: evidenceMetadata,
      })
      console.log(response)
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
