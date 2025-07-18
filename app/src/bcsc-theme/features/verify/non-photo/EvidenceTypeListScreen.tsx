import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useEffect } from 'react'
import { TextTheme } from '@/bcwallet-theme/theme'
import { BCState } from '@/store'

type EvidenceTypeListScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

// ok I need a component for the list items
// and a components for the headers

const EvidenceTypeListScreen: React.FC<EvidenceTypeListScreenProps> = ({ navigation }: EvidenceTypeListScreenProps) => {
  const { ColorPallet, Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { evidence } = useApi()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.md,
    },
    container: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    itemSeparator: {
      width: '100%',
      height: 8,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    step: {
      paddingVertical: 24,
      paddingHorizontal: 24,
      backgroundColor: ColorPallet.brand.secondaryBackground,
    },
    contentContainer: {
      marginTop: 16,
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    contentText: {
      flex: 1,
      flexWrap: 'wrap',
    },
    contentEmailContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contentEmail: {
      flex: 1,
      flexWrap: 'wrap',
    },
    contentEmailButton: {
      alignSelf: 'flex-end',
    },
  })

  useEffect(() => {
    const cards: any = {}
    const fetchData = async () => {
      const evidenceMetadata = await evidence.getEvidenceMetadata()
      console.log(evidenceMetadata)
      evidenceMetadata.processes.forEach((process) => {
        // TODO: update to use card flow selected
        // process.process === store.bcsc.cardType
        if (process.process === 'IDIM L3 Remote Non-photo BCSC Identity Verification') {
          process.evidence_types.forEach((evidenceType) => {
            if (!cards[evidenceType.group]) {
              cards[evidenceType.group] = [evidenceType]
            } else {
              cards[evidenceType.group].push(evidenceType)
            }
          })
        }
      })
    }

    fetchData()
  }, [evidence])
  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            Choose photo ID
          </ThemedText>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            Use an ID that has the same name as on your BC Services Card.
          </ThemedText>
        </View>
        <View>
          <TouchableOpacity
            onPress={() => {
              console.log('Woot')
            }}
            testID={testIdWithKey('Step1')}
            style={[styles.step, { backgroundColor: ColorPallet.brand.secondaryBackground }]}
          >
            <View>
              <ThemedText style={{ color: TextTheme.normal.color }}>{`ID: BC Services Card`}</ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default EvidenceTypeListScreen
