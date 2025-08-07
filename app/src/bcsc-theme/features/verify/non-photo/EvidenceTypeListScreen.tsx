import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { ActivityIndicator, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useEffect, useState } from 'react'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { EvidenceMetadataResponseData, EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCSCCardProcess } from '@/bcsc-theme/api/hooks/useAuthorizationApi'

type EvidenceTypeListScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const EvidenceTypeListScreen: React.FC<EvidenceTypeListScreenProps> = ({ navigation }: EvidenceTypeListScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { evidence } = useApi()
  const [store, dispatch] = useStore<BCState>()
  const [evidenceSections, setEvidenceSections] = useState<{ title: string; data: EvidenceType[] }[]>([])
  const { data, load, isLoading } = useDataLoader<EvidenceMetadataResponseData>(() => evidence.getEvidenceMetadata(), {
    onError: (error: unknown) => console.log(error),
  })

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
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
    sectionSeparator: {
      height: 10,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      alignSelf: 'center', // Centers the separator
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

  useEffect(() => {
    // filter data based on the selected card type (process)

    if (data) {
      let cards: Record<string, EvidenceType[]> = {}
      const selectedProcess =
        store.bcsc.cardType === BCSCCardType.NonPhoto ? BCSCCardProcess.BCSCNonPhoto : BCSCCardProcess.NonBCSC
      data.processes.forEach((p) => {
        // only show card that matches the selected process
        if (p.process === selectedProcess) {
          // for each evidence EvidenceTypeList
          p.evidence_types.forEach((e) => {
            if (
              store.bcsc.additionalEvidenceData.length > 0 &&
              (e.collection_order === 'BOTH' || e.collection_order === 'SECOND')
            ) {
              cards = addToEvidenceDictionary(cards, e)
            } else if (
              store.bcsc.additionalEvidenceData.length === 0 &&
              (e.collection_order === 'BOTH' || e.collection_order === 'FIRST')
            ) {
              cards = addToEvidenceDictionary(cards, e)
            }
          })
        }
      })
      const mappedData: { title: string; data: EvidenceType[] }[] = []
      Object.keys(cards).forEach((key) => {
        mappedData.push({
          title: key,
          data: cards[key],
        })
      })

      setEvidenceSections(mappedData)
    }
  }, [data])

  const addToEvidenceDictionary = (cards: Record<string, EvidenceType[]>, e: EvidenceType) => {
    if (!cards[e.group]) {
      cards[e.group] = [e]
    } else {
      cards[e.group].push(e)
    }
    return cards
  }

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      {store.bcsc.additionalEvidenceData.length > 0 ? (
        <View style={{ marginBottom: Spacing.lg }}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            Choose photo ID
          </ThemedText>
          <ThemedText>Use an ID that has the same name as on your BC Services Card.</ThemedText>
        </View>
      ) : (
        <View style={{ marginBottom: Spacing.lg }}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            Choose your first ID
          </ThemedText>
        </View>
      )}

      <SectionList
        sections={evidenceSections || []}
        SectionSeparatorComponent={({ trailingItem }) =>
          trailingItem ? null : <View style={styles.sectionSeparator} />
        }
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: ColorPalette.brand.secondaryBackground }}>
            <View style={styles.itemSeparator} />
          </View>
        )}
        renderSectionHeader={(item) => (
          <ThemedText style={[styles.cardSection, { color: ColorPalette.brand.primary }]} variant={'headingFour'}>
            {item.section.title}
          </ThemedText>
        )}
        renderItem={(data) => (
          <TouchableOpacity
            onPress={() => {
              // navigate to the next screen with the correct data
              dispatch({
                type: BCDispatchAction.ADD_EVIDENCE_TYPE,
                payload: [data.item as EvidenceType],
              })
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
