import { Link, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface SetupStep {
  title: string
  active: boolean
  complete: boolean
  content: JSX.Element
  onPress?: () => void
  testIDKey: string
}

type VerificationStepsContentProps = {
  goToEvidenceCollectionStep: () => void
  goToResidentialAddressStep: () => void
  goToEmailStep: () => void
  goToVerifyIdentityStep: () => void
}

export const VerificationStepsContent: React.FC<VerificationStepsContentProps> = ({
  goToEvidenceCollectionStep,
}: VerificationStepsContentProps) => {
  const { ColorPallet } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
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
      flex: 1,
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

  const steps: SetupStep[] = useMemo(() => {
    return [
      {
        title: 'Step 1',
        active: true,
        complete: false,
        content: (
          <ThemedText style={[styles.contentText, { color: ColorPallet.brand.text }]}>
            {t('Unified.Steps.ScanOrTakePhotos')}
          </ThemedText>
        ),
        onPress: () => goToEvidenceCollectionStep(),
        testIDKey: 'Step1',
      },
      {
        title: 'Step 2',
        active: false,
        complete: true,
        content: (
          <ThemedText style={styles.contentText}>
            Address: Residential address from your BC Services Card will be used
          </ThemedText>
        ),
        onPress: () => null,
        testIDKey: 'Step2',
      },
      {
        title: 'Step 3',
        active: false,
        complete: true,
        content: (
          <View style={styles.contentEmailContainer}>
            <ThemedText style={styles.contentEmail}>Email: j.lee-martinez@email.com</ThemedText>
            <View style={styles.contentEmailButton}>
              <Link style={{ textDecorationLine: 'none' }} linkText={'Edit'} onPress={() => null} />
            </View>
          </View>
        ),
        onPress: () => null,
        testIDKey: 'Step3',
      },
      {
        title: 'Step 4',
        active: false,
        complete: false,
        content: <ThemedText style={styles.contentText}>Verify identity by April 20, 2025</ThemedText>,
        onPress: () => null,
        testIDKey: 'Step4',
      },
    ]
  }, [styles, t, goToEvidenceCollectionStep, ColorPallet.brand.text])

  return (
    <View style={styles.container}>
      <FlatList
        data={steps}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => item.onPress?.()}
            accessible={!!item.onPress}
            testID={testIdWithKey(item.testIDKey)}
            accessibilityLabel={item.title}
          >
            <View
              style={[
                styles.step,
                { backgroundColor: item.active ? ColorPallet.brand.primary : ColorPallet.brand.secondaryBackground },
              ]}
            >
              <View style={styles.titleRow}>
                <ThemedText
                  variant={'headingFour'}
                  style={{ marginRight: 16, color: item.active ? ColorPallet.brand.text : undefined }}
                >
                  {item.title}
                </ThemedText>
                {item.complete ? <Icon name={'check-circle'} size={24} color={ColorPallet.semantic.success} /> : null}
              </View>
              <View style={styles.contentContainer}>{item.content}</View>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        keyExtractor={(item) => item.title}
      />
    </View>
  )
}

export default VerificationStepsContent
