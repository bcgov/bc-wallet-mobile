import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useCallback, useEffect, useState } from 'react'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { EvidenceMetadataResponseData, EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { useTranslation } from 'react-i18next'
import { getCardProcessForCardType } from '@/bcsc-theme/utils/card-utils'

type EvidenceTypeListScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

interface SectionData {
  title: string
  data: EvidenceType[]
}

const SectionSeparator = ({ trailingItem }: { trailingItem?: boolean }) => {
  const { ColorPalette } = useTheme()
  if (trailingItem) {
    return null
  } else {
    return <View style={{ height: 10, backgroundColor: ColorPalette.brand.secondaryBackground, alignSelf: 'center' }} />
  }
}

const ItemSeparator = () => {
  const { ColorPalette } = useTheme()
  return (
    <View
      style={{ height: 2, width: '95%', backgroundColor: ColorPalette.brand.primaryBackground, alignSelf: 'center' }}
    />
  )
}

const EvidenceTypeListScreen: React.FC<EvidenceTypeListScreenProps> = ({ navigation }: EvidenceTypeListScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { evidence } = useApi()
  const [store, dispatch] = useStore<BCState>()
  const [evidenceSections, setEvidenceSections] = useState<{ title: string; data: EvidenceType[] }[]>([])
  const { data, load, isLoading } = useDataLoader<EvidenceMetadataResponseData>(() => evidence.getEvidenceMetadata(), {
    onError: (error: unknown) => {
      logger.error(`Error loading evidence metadata: ${error}`)
    },
  })

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      padding: Spacing.md,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.md,
    },
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
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
  }, [load])

  const shouldAddEvidence = useCallback(
    (card: EvidenceType): boolean => {
      const { collection_order } = card
      // If no additional evidence is present, the user is seeing this screen for the first time
      if (store.bcsc.additionalEvidenceData.length === 0) {
        return collection_order === 'BOTH' || collection_order === 'FIRST'
      } else {
        return (
          (collection_order === 'BOTH' || collection_order === 'SECOND') &&
          // if the user is seeing this screen for the second time, we only show cards that are not already selected
          !store.bcsc.additionalEvidenceData.some(
            (evidence) => evidence.evidenceType.evidence_type_label === card.evidence_type_label
          )
        )
      }
    },
    [store.bcsc.additionalEvidenceData]
  )

  useEffect(() => {
    if (!data) return

    // filter data based on the selected card type (process)
    let cards: Record<string, EvidenceType[]> = {}
    const selectedProcess = getCardProcessForCardType(store.bcsc.cardType)
    data.processes.forEach((p) => {
      // only show card that matches the selected process
      if (p.process === selectedProcess) {
        // for each card, check if the user should be seeing them or not
        // list is filtered differently based on when the user seeing this screen
        // first and second runs will show slightly different cards
        p.evidence_types.forEach((e) => {
          if (shouldAddEvidence(e)) {
            cards = addToEvidenceDictionary(cards, e)
          }
        })
      }
    })
    const mappedData = mapEvidenceToSections(cards)
    setEvidenceSections(mappedData)
  }, [data, store.bcsc.cardType, shouldAddEvidence])

  const mapEvidenceToSections = (cards: Record<string, EvidenceType[]>): SectionData[] => {
    const mappedData: { title: string; data: EvidenceType[] }[] = []
    Object.keys(cards).forEach((key) => {
      mappedData.push({
        title: key,
        data: cards[key],
      })
    })
    return mappedData
  }

  const addToEvidenceDictionary = (cards: Record<string, EvidenceType[]>, e: EvidenceType) => {
    if (!cards[e.group]) {
      cards[e.group] = [e]
    } else {
      cards[e.group].push(e)
    }
    return cards
  }

  /**
   * Generates the heading and description text based on the current state of evidence selection.
   *
   * @returns {[string, string]} An array containing the heading and description text.
   */
  const getEvidenceHeadingAndDescription = useCallback(() => {
    const evidenceCount = store.bcsc.additionalEvidenceData.length
    const isNonBCSCCard = store.bcsc.cardType === BCSCCardType.Other

    if (evidenceCount === 1 && isNonBCSCCard) {
      // Choose your second ID
      return [t('Unified.EvidenceTypeList.SecondID'), t('Unified.EvidenceTypeList.NonBCSCDescription')]
    }

    if (evidenceCount === 1 && !isNonBCSCCard) {
      // Choose photo ID
      return [t('Unified.EvidenceTypeList.Heading'), t('Unified.EvidenceTypeList.Description')]
    }

    // Choose your first ID
    return [t('Unified.EvidenceTypeList.FirstID'), '']
  }, [store.bcsc.additionalEvidenceData.length, store.bcsc.cardType, t])

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={{ marginBottom: Spacing.lg }}>
        <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
          {getEvidenceHeadingAndDescription()[0]}
        </ThemedText>
        {getEvidenceHeadingAndDescription()[1] ? (
          <ThemedText style={{ marginBottom: Spacing.md }}>{getEvidenceHeadingAndDescription()[1]}</ThemedText>
        ) : null}
      </View>

      <SectionList
        sections={evidenceSections || []}
        SectionSeparatorComponent={SectionSeparator}
        ItemSeparatorComponent={ItemSeparator}
        renderSectionHeader={(item) => (
          <ThemedText style={[styles.cardSection, { color: ColorPalette.brand.primary }]} variant={'headingFour'}>
            {item.section.title}
          </ThemedText>
        )}
        renderItem={(data) => (
          <Pressable
            onPress={() => {
              // navigate to the next screen with the correct data
              dispatch({
                type: BCDispatchAction.ADD_EVIDENCE_TYPE,
                payload: [data.item as EvidenceType],
              })
              navigation.navigate(BCSCScreens.IDPhotoInformation, { cardType: data.item })
            }}
            testID={testIdWithKey(`EvidenceTypeListItem ${data.item.evidence_type_label}`)}
            style={({ pressed }) => [
              styles.cardSection,
              pressed && { backgroundColor: ColorPalette.brand.primaryLight, opacity: 0.8 },
            ]}
          >
            <View>
              <ThemedText>{data.item.evidence_type_label}</ThemedText>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}

export default EvidenceTypeListScreen
