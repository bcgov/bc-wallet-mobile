import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import RectangularMask from '@/bcsc-theme/components/RectangularMask'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { Button, ButtonType, Text, ThemedText, useTheme } from '@bifold/core'
import { TextInput, View } from 'react-native'

type EvidenceIDCollectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EvidenceIDCollection>
  route: { params: { cardType: EvidenceType } }
}

const EvidenceIDCollectionScreen: React.FC<EvidenceIDCollectionScreenProps> = ({ navigation, route }) => {
  const { Inputs } = useTheme()
  const { cardType } = route.params
  const [currentDocumentNumber, setCurrentDocumentNumber] = useState('')

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
            onPress={() => console.log('Continue')}
          />
        </View>
        <Button
          title="Cancel"
          accessibilityLabel={'Cancel'}
          testID={''}
          buttonType={ButtonType.Secondary}
          onPress={() => console.log('Cancel')}
        />
      </View>
    </SafeAreaView>
  )
}

export default EvidenceIDCollectionScreen
