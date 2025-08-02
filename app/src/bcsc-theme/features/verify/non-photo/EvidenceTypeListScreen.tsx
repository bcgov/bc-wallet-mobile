import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { SectionList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useEffect } from 'react'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'

type EvidenceTypeListScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const EvidenceTypeListScreen: React.FC<EvidenceTypeListScreenProps> = ({ navigation }: EvidenceTypeListScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { data, load } = useDataLoader<any[]>(
    async () => {
      const cards: Record<string, EvidenceType[]> = {}
      const evidenceMetadata = await evidence.getEvidenceMetadata()
      evidenceMetadata.processes.forEach((process) => {
        process.evidence_types.forEach((evidenceType) => {
          if (!cards[evidenceType.group]) {
            cards[evidenceType.group] = [evidenceType]
          } else {
            cards[evidenceType.group].push(evidenceType)
          }
        })
      })
      const data: any[] = []
      Object.keys(cards).forEach((key) => {
        data.push({
          title: key,
          data: cards[key],
        })
      })
      return data
    },
    { onError: (error: unknown) => console.log(error) }
  )

  const { evidence } = useApi()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      // backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.lg,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.md,
    },
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    itemSeparator: {
      height: 2,
      width: '95%',
      backgroundColor: ColorPalette.brand.primaryBackground,
      alignSelf: 'center', // Centers the separator
    },
    cardSection: {
      paddingVertical: 24,
      paddingHorizontal: 24,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    contentContainer: {
      marginTop: 16,
      flex: 1,
    },
  })

  useEffect(() => {
    load()
  }, [])

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={{ marginBottom: Spacing.lg }}>
        <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
          Choose photo ID
        </ThemedText>
        <ThemedText>Use an ID that has the same name as on your BC Services Card.</ThemedText>
      </View>
      <SectionList
        sections={data || []}
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: ColorPalette.brand.secondaryBackground }}>
            <View style={styles.itemSeparator} />
          </View>
        )}
        renderSectionHeader={(item) => (
          <ThemedText style={[styles.cardSection]} variant={'headingFour'}>
            {item.section.title}
          </ThemedText>
        )}
        renderItem={(data) => (
          <TouchableOpacity
            onPress={() => {
              // navigate to the next screen with the correct data
              navigation.navigate(BCSCScreens.IDPhotoInformation, { cardType: data.item })
            }}
            testID={testIdWithKey('Step1')}
            style={[styles.cardSection]}
          >
            <View>
              <ThemedText>{data.item.evidence_type_label}</ThemedText>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

export default EvidenceTypeListScreen
