import useApi from '@/bcsc-theme/api/hooks/useApi'
import { EvidenceMetadataResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { ScreenWrapper, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { RouteProp, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native'
import { BCSCCardProcess, EvidenceType } from 'react-native-bcsc-core'

type EvidenceTypeListScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceTypeList>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.EvidenceTypeList>
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

const EvidenceTypeListScreen = ({ navigation, route }: EvidenceTypeListScreenProps) => {
  const { cardProcess, photoFilter } = route.params
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { evidence } = useApi()
  const [store] = useStore<BCState>()
  const { removeIncompleteEvidence, addEvidenceType } = useSecureActions()
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
    cardSection: {
      paddingVertical: 24,
      paddingHorizontal: 24,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
  })

  // Clean up any incomplete evidence entries when the screen focuses.
  // This handles the case where user selected a card but backed out before completing.
  // Intentionally empty deps — run only once per focus, not when evidence changes,
  // because removeIncompleteEvidence itself updates the evidence array.
  useFocusEffect(
    useCallback(() => {
      removeIncompleteEvidence(store.bcscSecure.additionalEvidenceData)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  )

  useEffect(() => {
    load()
  }, [load])

  const shouldAddEvidence = useCallback(
    (card: EvidenceType): boolean => {
      const { collection_order } = card
      // If no additional evidence is present, the user is seeing this screen for the first time
      if (store.bcscSecure.additionalEvidenceData.length === 0) {
        return collection_order === 'BOTH' || collection_order === 'FIRST'
      } else {
        return (
          (collection_order === 'BOTH' || collection_order === 'SECOND') &&
          // if the user is seeing this screen for the second time, we only show cards that are not already selected
          !store.bcscSecure.additionalEvidenceData.some(
            (evidence) => evidence.evidenceType?.evidence_type_label === card.evidence_type_label
          )
        )
      }
    },
    [store.bcscSecure.additionalEvidenceData]
  )

  useEffect(() => {
    if (!data) {
      return
    }

    // filter data based on the selected card type (process)
    let cards: Record<string, EvidenceType[]> = {}

    data.processes.forEach((p) => {
      // only show card that matches the selected process
      if (p.process === cardProcess) {
        // for each card, check if the user should be seeing them or not
        // list is filtered differently based on when the user seeing this screen
        // first and second runs will show slightly different cards
        p.evidence_types.forEach((e) => {
          // Apply photo filter if specified (used by non-photo BCSC flow)
          if (photoFilter === 'photo' && !e.has_photo) {
            return
          }
          if (photoFilter === 'nonPhoto' && e.has_photo) {
            return
          }

          if (shouldAddEvidence(e)) {
            cards = addToEvidenceDictionary(cards, e)
          }
        })
      }
    })
    const mappedData = mapEvidenceToSections(cards)
    setEvidenceSections(mappedData)
  }, [data, cardProcess, photoFilter, shouldAddEvidence])

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
    const evidenceCount = store.bcscSecure.additionalEvidenceData.length
    const isNonBCSCCard = cardProcess === BCSCCardProcess.NonBCSC

    if (evidenceCount === 1 && isNonBCSCCard) {
      // Choose your second ID
      return [t('BCSC.EvidenceTypeList.SecondID'), t('BCSC.EvidenceTypeList.NonBCSCDescription')]
    }

    if (evidenceCount === 1 && !isNonBCSCCard) {
      // Choose photo ID
      return [t('BCSC.EvidenceTypeList.Heading'), t('BCSC.EvidenceTypeList.Description')]
    }

    if (photoFilter === 'photo') {
      // Non-photo BCSC first visit — showing photo IDs
      return [t('BCSC.EvidenceTypeList.Heading'), t('BCSC.EvidenceTypeList.Description')]
    }

    if (photoFilter === 'nonPhoto') {
      // Non-photo BCSC "Other Options" — showing non-photo IDs
      return [t('BCSC.EvidenceTypeList.OtherIDOptionsHeading'), t('BCSC.EvidenceTypeList.OtherIDOptionsDescription')]
    }

    // Choose your first ID
    return [t('BCSC.EvidenceTypeList.FirstID'), '']
  }, [store.bcscSecure.additionalEvidenceData.length, cardProcess, photoFilter, t])

  /**
   * Whether the "Other Options" escape hatch should be shown.
   * Only shown when:
   * - Filtering for photo IDs (photoFilter === 'photo')
   * - First evidence selection (no evidence selected yet)
   * This matches v3 behavior: non-photo BCSC users who don't have a photo ID
   * can choose a non-photo ID instead (but will still need a photo ID afterward).
   */
  const showOtherOptions = photoFilter === 'photo' && store.bcscSecure.additionalEvidenceData.length === 0

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
            accessibilityLabel={data.item.evidence_type_label}
            accessibilityRole="button"
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
        ListFooterComponent={
          showOtherOptions ? (
            <>
              <SectionSeparator />
              <ThemedText style={[styles.cardSection, { color: ColorPalette.brand.primary }]} variant={'headingFour'}>
                {t('BCSC.EvidenceTypeList.OtherOptions')}
              </ThemedText>
              <Pressable
                onPress={() => {
                  navigation.replace(BCSCScreens.EvidenceTypeList, {
                    cardProcess,
                    photoFilter: 'nonPhoto',
                  })
                }}
                testID={testIdWithKey('EvidenceTypeListOtherOptions')}
                accessibilityLabel={t('BCSC.EvidenceTypeList.ShowMoreOptions')}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.cardSection,
                  pressed && { backgroundColor: ColorPalette.brand.primaryLight, opacity: 0.8 },
                ]}
              >
                <ThemedText>{t('BCSC.EvidenceTypeList.ShowMoreOptions')}</ThemedText>
              </Pressable>
            </>
          ) : null
        }
      />
    </ScreenWrapper>
  )
}

export default EvidenceTypeListScreen
