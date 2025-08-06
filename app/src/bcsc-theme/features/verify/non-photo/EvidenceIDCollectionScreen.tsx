import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { Button, ButtonType, Text, ThemedText, useStore, useTheme } from '@bifold/core'
import { TextInput, View } from 'react-native'
import { BCDispatchAction, BCState } from '@/store'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import RNFS from 'react-native-fs'
import { Buffer } from 'buffer'
import { CommonActions } from '@react-navigation/native'

type EvidenceIDCollectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EvidenceIDCollection>
  route: { params: { cardType: EvidenceType } }
}

const EvidenceIDCollectionScreen = ({ navigation, route }: EvidenceIDCollectionScreenProps) => {
  const [, dispatch] = useStore<BCState>()
  const { Inputs } = useTheme()
  const { cardType } = route.params

  const [currentDocumentNumber, setCurrentDocumentNumber] = useState('')

  const handleOnContinue = async () => {
    dispatch({
      type: BCDispatchAction.UPDATE_EVIDENCE_DOCUMENT_NUMBER,
      payload: [{ evidenceType: route.params.cardType, documentNumber: currentDocumentNumber }],
    })
    //TODO: (al) this all needs to be moved into the video verify steps...
    // if (store.bcsc.additionalEvidenceData.length > 0) {
    //   const evidenceMetadata = store.bcsc.evidenceMetadata

    //   // this stuff needs to be moved into the video verify steps...
    //   // so we will need, the evidence metadata, the document ID and the path to the images
    //   const response = await evidence.sendEvidenceMetadata({
    //     type: cardType.evidence_type,
    //     number: currentDocumentNumber,
    //     // remove file_path from metadata before sending
    //     images: evidenceMetadata.map(({ file_path, ...metadata }) => ({ ...metadata })),
    //   })

    //   // Create upload promises for each image
    //   const uploadPromises = evidenceMetadata.map(async (metadata) => {
    //     const foundItem = response.find((item) => item.label === metadata.label)
    //     if (!foundItem) {
    //       throw new Error(`No upload URL found for ${metadata.label}`)
    //     }

    //     try {
    //       // Read the image file into bytes
    //       const base64Data = await RNFS.readFile(metadata.file_path, 'base64')
    //       const imageBytes = Buffer.from(base64Data, 'base64')

    //       // Upload the image to the provided URL
    //       await evidence.uploadPhotoEvidenceBinary(foundItem.upload_uri, imageBytes)

    //       return {
    //         label: metadata.label,
    //         success: true,
    //       }
    //     } catch (error) {
    //       console.error(`Failed to upload ${metadata.label}:`, error)
    //       return {
    //         label: metadata.label,
    //         success: false,
    //         error,
    //       }
    //     }
    //   })

    //   // Wait for all uploads to complete
    //   await Promise.all(uploadPromises)

    //   // if the promises don't throw an error, we can assume the upload was successful
    // }
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.EvidenceTypeList }],
      })
    )
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
