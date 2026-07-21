import useApi from '@/bcsc-theme/api/hooks/useApi'
import { EvidenceMetadataResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { ListButton, ListButtonGroup } from '@/bcsc-theme/components/ListButton'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isCardEvidenceComplete } from '@/bcsc-theme/utils/card-utils'
import { ICON_SIZE } from '@/constants'
import { BCState } from '@/store'
import { ScreenWrapper, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { RouteProp, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { a11yLabel, a11yShortLabel } from '@utils/accessibility'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { BCSCCardProcess, EvidenceType } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialIcons'

type EvidenceTypeListScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceTypeList>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.EvidenceTypeList>
}

interface SectionData {
  title: string
  data: EvidenceType[]
}

/**
 * Screen that lists the identity documents (evidence types) a user can choose from
 * while verifying their identity.
 *
 * The same screen serves both steps of ID collection: it is pushed once for the
 * first ID and again for the second, and filters the available cards based on the
 * selected card process, each card's `collection_order` (FIRST / SECOND / BOTH),
 * and any IDs already chosen — so a document can never be picked twice.
 *
 * When `photoFilter` is set (non-photo BCSC flow), the list is further restricted
 * to photo-only or non-photo-only IDs, and an "Other Options" escape hatch lets
 * users without a photo ID switch to the non-photo list.
 *
 * On focus, the screen also reconciles the evidence store with the navigation
 * state: incomplete (abandoned) selections are removed on the first visit, and
 * navigating back to this screen releases the ID(s) chosen from it so they become
 * selectable again.
 *
 * @param props - Navigation and route props.
 * @param props.navigation - Stack navigator used to push the ID photo instructions screen or swap photo filters.
 * @param props.route - Route params: `cardProcess` (the selected card process) and optional `photoFilter` ('photo' | 'nonPhoto').
 * @returns The evidence type selection screen.
 */
const EvidenceTypeListScreen = ({ navigation, route }: EvidenceTypeListScreenProps) => {
  const { cardProcess, photoFilter } = route.params
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { evidence } = useApi()
  const [store] = useStore<BCState>()
  const { addEvidenceType, removeIncompleteEvidence, truncateEvidence } = useSecureActions()
  const [evidenceSections, setEvidenceSections] = useState<SectionData[]>([])
  const { data, load, isLoading } = useDataLoader<EvidenceMetadataResponseData>(() => evidence.getEvidenceMetadata(), {
    onError: (error: unknown) => {
      logger.error(`Error loading evidence metadata: ${error}`)
    },
  })

  const styles = StyleSheet.create({
    section: {
      gap: Spacing.md,
    },
    sectionTitle: {
      ...TextTheme.bold,
      color: ColorPalette.brand.headerText,
    },
    listButtonContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    listButtonTitle: {
      flex: 1,
      color: ColorPalette.brand.headerText,
    },
  })

  // Latest store for the focus effect, read through a ref so the callback stays stable and runs once
  // per focus (rather than re-running every time the evidence list changes).
  const storeRef = useRef(store)
  storeRef.current = store
  // How many IDs were already collected when THIS list instance was first shown. Each instance in the
  // stack (the first-ID list and the second-ID list) keeps its own baseline, so backing to one only
  // releases the ID chosen from it.
  const baselineCountRef = useRef<number | null>(null)

  useFocusEffect(
    useCallback(() => {
      const evidence = storeRef.current.bcscSecure.additionalEvidenceData
      if (baselineCountRef.current === null) {
        // First (forward) visit: the baseline is how many IDs are already fully collected before this
        // list. Count only complete entries — the incomplete/abandoned ones (a card picked but never
        // captured) are removed by the cleanup below, so they must not inflate the baseline (which
        // would later leave a stale entry behind on back-navigation).
        baselineCountRef.current = evidence.filter(isCardEvidenceComplete).length
        removeIncompleteEvidence(evidence).catch((error) =>
          logger.error(`Error removing incomplete evidence: ${error}`)
        )
      } else if (evidence.length > baselineCountRef.current) {
        // Returned here via the back button: drop the ID(s) chosen from this list onward so they
        // become selectable again, keeping the ones collected before it.
        truncateEvidence(evidence, baselineCountRef.current).catch((error) =>
          logger.error(`Error truncating evidence: ${error}`)
        )
      }
    }, [removeIncompleteEvidence, truncateEvidence, logger])
  )

  useEffect(() => {
    load()
  }, [load])

  const shouldAddEvidence = useCallback(
    (card: EvidenceType): boolean => {
      const allEvidence = store.bcscSecure.additionalEvidenceData

      const order = card.collection_order
      // Hide cards that have already been added to evidence — completed or not —
      // so the user can't pick the same ID twice (e.g. Canadian Passport as both first and second ID).
      const isAlreadyUsed = allEvidence.some((evidence) => evidence.evidenceType?.evidence_type === card.evidence_type)

      if (isAlreadyUsed) {
        return false
      }

      if (order === 'BOTH') {
        return true
      }

      if (allEvidence.length === 0) {
        return order === 'FIRST'
      }

      if (!isCardEvidenceComplete(allEvidence[0])) {
        return order === 'FIRST'
      }

      return order === 'SECOND'
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
  const getEvidenceHeadingAndDescription = useCallback((): [string, string] => {
    const isFirstEvidenceComplete = isCardEvidenceComplete(store.bcscSecure.additionalEvidenceData[0])
    const isNonBCSCCard = cardProcess === BCSCCardProcess.NonBCSC

    if (isFirstEvidenceComplete && isNonBCSCCard) {
      // Choose your second ID
      return [t('BCSC.EvidenceTypeList.SecondID'), t('BCSC.EvidenceTypeList.NonBCSCDescription')]
    }

    if (isFirstEvidenceComplete && !isNonBCSCCard) {
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
  }, [cardProcess, photoFilter, store.bcscSecure.additionalEvidenceData, t])

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

  const [heading, description] = getEvidenceHeadingAndDescription()

  return (
    <ScreenWrapper
      padded={false}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.lg,
        padding: Spacing.lg,
      }}
    >
      <View style={{ gap: Spacing.sm }}>
        <ThemedText variant={'headingThree'}>{heading}</ThemedText>
        {description ? <ThemedText>{description}</ThemedText> : null}
      </View>

      {evidenceSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
          <ListButtonGroup>
            {section.data.map((item) => (
              <ListButton
                key={item.evidence_type_label}
                onPress={() => {
                  addEvidenceType(item)
                  // push (not navigate) so the second ID opens a fresh instructions screen instead of
                  // popping back to the first ID's IDPhotoInformation already in the stack.
                  navigation.push(BCSCScreens.IDPhotoInformation, { cardType: item })
                }}
                testID={testIdWithKey(`EvidenceTypeListItem-${item.evidence_type}`)}
                accessibilityLabel={a11yShortLabel(item.evidence_type_label)}
              >
                <View style={styles.listButtonContainer}>
                  <ThemedText style={styles.listButtonTitle}>{item.evidence_type_label}</ThemedText>
                  <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
                </View>
              </ListButton>
            ))}
          </ListButtonGroup>
        </View>
      ))}

      {showOtherOptions ? (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('BCSC.EvidenceTypeList.OtherOptions')}</ThemedText>
          <ListButtonGroup>
            <ListButton
              onPress={() => {
                navigation.replace(BCSCScreens.EvidenceTypeList, {
                  cardProcess,
                  photoFilter: 'nonPhoto',
                })
              }}
              testID={testIdWithKey('EvidenceTypeListOtherOptions')}
              accessibilityLabel={a11yLabel(t('BCSC.EvidenceTypeList.ShowMoreOptions'))}
            >
              <View style={styles.listButtonContainer}>
                <ThemedText style={styles.listButtonTitle}>{t('BCSC.EvidenceTypeList.ShowMoreOptions')}</ThemedText>
                <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
              </View>
            </ListButton>
          </ListButtonGroup>
        </View>
      ) : null}
    </ScreenWrapper>
  )
}

export default EvidenceTypeListScreen
