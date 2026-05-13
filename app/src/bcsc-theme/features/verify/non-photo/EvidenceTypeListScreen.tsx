import useApi from '@/bcsc-theme/api/hooks/useApi'
import { EvidenceMetadataResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isCardEvidenceComplete } from '@/bcsc-theme/utils/card-utils'
import { BCState } from '@/store'
import { ScreenWrapper, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { RouteProp, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { a11yLabel, a11yShortLabel } from '@utils/accessibility'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { BCSCCardProcess, EvidenceType } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type EvidenceTypeListScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceTypeList>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.EvidenceTypeList>
}

interface SectionData {
  title: string
  data: EvidenceType[]
}

const EvidenceTypeListScreen = ({ navigation, route }: EvidenceTypeListScreenProps) => {
  const { cardProcess, photoFilter } = route.params
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { evidence } = useApi()
  const [store] = useStore<BCState>()
  const { addEvidenceType, removeIncompleteEvidence } = useSecureActions()
  const [evidenceSections, setEvidenceSections] = useState<SectionData[]>([])
  const { data, load, isLoading } = useDataLoader<EvidenceMetadataResponseData>(() => evidence.getEvidenceMetadata(), {
    onError: (error: unknown) => {
      logger.error(`Error loading evidence metadata: ${error}`)
    },
  })

  const styles = StyleSheet.create({
    section: {
      gap: Spacing.lg,
    },
    cardGroup: {
      backgroundColor: ColorPalette.brand.secondaryBackground,
      borderRadius: Spacing.sm,
      borderWidth: 1,
      borderColor: ColorPalette.notification.infoBorder,
      overflow: 'hidden',
    },
    cardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
    },
    cardItemDivider: {
      borderTopWidth: 1,
      borderTopColor: ColorPalette.notification.infoBorder,
    },
    cardItemPressed: {
      backgroundColor: ColorPalette.brand.primaryLight,
    },
    cardItemLabel: {
      flexShrink: 1,
      marginRight: Spacing.sm,
    },
  })

  // Clean up any incomplete evidence entries when the screen focuses.
  // This handles the case where user selected a card but backed out before completing.
  useFocusEffect(
    useCallback(() => {
      removeIncompleteEvidence(store.bcscSecure.additionalEvidenceData)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.bcscSecure.additionalEvidenceData])
  )

  useEffect(() => {
    load()
  }, [load])

  const shouldAddEvidence = useCallback(
    (card: EvidenceType): boolean => {
      const allEvidence = store.bcscSecure.additionalEvidenceData
      const order = card.collection_order
      const isComplete = allEvidence.some(
        (evidence) =>
          evidence.evidenceType?.evidence_type_label === card.evidence_type_label && isCardEvidenceComplete(evidence)
      )

      if (isComplete) {
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
          <ThemedText variant={'headingFour'}>{section.title}</ThemedText>
          <View style={styles.cardGroup}>
            {section.data.map((item, index) => (
              <Pressable
                key={item.evidence_type_label}
                onPress={() => {
                  addEvidenceType(item)
                  navigation.navigate(BCSCScreens.IDPhotoInformation, { cardType: item })
                }}
                testID={testIdWithKey(`EvidenceTypeListItem ${item.evidence_type_label}`)}
                accessibilityLabel={a11yShortLabel(item.evidence_type_label)}
                accessibilityRole={'button'}
                style={({ pressed }) => [
                  styles.cardItem,
                  index > 0 && styles.cardItemDivider,
                  pressed && styles.cardItemPressed,
                ]}
              >
                <ThemedText variant={'bold'} style={styles.cardItemLabel}>
                  {item.evidence_type_label}
                </ThemedText>
                <Icon name={'chevron-right'} size={24} color={ColorPalette.brand.primary} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {showOtherOptions ? (
        <View style={styles.section}>
          <ThemedText variant={'headingFour'}>{t('BCSC.EvidenceTypeList.OtherOptions')}</ThemedText>
          <View style={styles.cardGroup}>
            <Pressable
              onPress={() => {
                navigation.replace(BCSCScreens.EvidenceTypeList, {
                  cardProcess,
                  photoFilter: 'nonPhoto',
                })
              }}
              testID={testIdWithKey('EvidenceTypeListOtherOptions')}
              accessibilityLabel={a11yLabel(t('BCSC.EvidenceTypeList.ShowMoreOptions'))}
              accessibilityRole={'button'}
              style={({ pressed }) => [styles.cardItem, pressed && styles.cardItemPressed]}
            >
              <ThemedText variant={'bold'} style={styles.cardItemLabel}>
                {t('BCSC.EvidenceTypeList.ShowMoreOptions')}
              </ThemedText>
              <Icon name={'chevron-right'} size={24} color={ColorPalette.brand.primary} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScreenWrapper>
  )
}

export default EvidenceTypeListScreen
