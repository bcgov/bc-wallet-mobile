import useApi from '@/bcsc-theme/api/hooks/useApi'
import { EvidenceMetadataResponseData, EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { ScreenWrapper, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'

type EvidenceTypeListScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.AdditionalIdentificationRequired>
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
  const [store] = useStore<BCState>()
  const { removeIncompleteEvidence, addEvidenceType } = useSecureActions()
  const [evidenceSections, setEvidenceSections] = useState<{ title: string; data: EvidenceType[] }[]>([])
  const didCleanupRef = useRef(false)
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
    cardSection: {
      paddingVertical: 24,
      paddingHorizontal: 24,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
  })

  // Clean up any incomplete evidence entries when the screen mounts
  // This handles the case where user selected a card but backed out before completing
  useEffect(() => {
    if (!didCleanupRef.current) {
      didCleanupRef.current = true
      removeIncompleteEvidence()
    }
  }, [removeIncompleteEvidence])

  useEffect(() => {
    load()
  }, [load])

  const shouldAddEvidence = useCallback(
    (card: EvidenceType): boolean => {
      const { collection_order } = card
      // If no additional evidence is present, the user is seeing this screen for the first time
      if (store.bcscSecure.additionalEvidenceData?.length === 0) {
        return collection_order === 'BOTH' || collection_order === 'FIRST'
      } else {
        return (
          (collection_order === 'BOTH' || collection_order === 'SECOND') &&
          // if the user is seeing this screen for the second time, we only show cards that are not already selected
          !(store.bcscSecure.additionalEvidenceData || []).some(
            (evidence) => evidence.evidenceType.evidence_type_label === card.evidence_type_label,
          )
        )
      }
    },
    [store.bcscSecure.additionalEvidenceData],
  )

  useEffect(() => {
    if (!data) return

    // filter data based on the selected card type (process)
    let cards: Record<string, EvidenceType[]> = {}

    const selectedProcess = store.bcscSecure.cardProcess
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
  }, [data, store.bcscSecure.cardProcess, shouldAddEvidence])

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
    const evidenceCount = store.bcscSecure.additionalEvidenceData?.length
    const isNonBCSCCard = store.bcscSecure.cardProcess === BCSCCardProcess.NonBCSC

    if (evidenceCount === 1 && isNonBCSCCard) {
      // Choose your second ID
      return [t('BCSC.EvidenceTypeList.SecondID'), t('BCSC.EvidenceTypeList.NonBCSCDescription')]
    }

    if (evidenceCount === 1 && !isNonBCSCCard) {
      // Choose photo ID
      return [t('BCSC.EvidenceTypeList.Heading'), t('BCSC.EvidenceTypeList.Description')]
    }

    // Choose your first ID
    return [t('BCSC.EvidenceTypeList.FirstID'), '']
  }, [store.bcscSecure.additionalEvidenceData?.length, store.bcscSecure.cardProcess, t])

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  return (
    <ScreenWrapper padded={false} scrollable={false} style={styles.pageContainer}>
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
        showsVerticalScrollIndicator={false}
        renderSectionHeader={(item) => (
          <ThemedText style={[styles.cardSection, { color: ColorPalette.brand.primary }]} variant={'headingFour'}>
            {item.section.title}
          </ThemedText>
        )}
        renderItem={(data: { item: EvidenceType }) => (
          <Pressable
            onPress={() => {
              // navigate to the next screen with the correct data
              addEvidenceType(data.item)
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
    </ScreenWrapper>
  )
}

export default EvidenceTypeListScreen
