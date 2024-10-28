import { Link, testIdWithKey, useTheme } from '@hyperledger/aries-bifold-core'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View, StyleSheet, FlatList, Pressable } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface SetupStep {
  title: string
  active: boolean
  complete: boolean
  content: JSX.Element
  onPress?: () => void
  testIDKey: string
}

type ContentProps = {
  goToStep1: () => void
  goToStep2: () => void
  goToStep3: () => void
  goToStep4: () => void
}

export const VerificationStepsContent: React.FC<ContentProps> = ({ goToStep1 }: ContentProps) => {
  const { ColorPallet, TextTheme } = useTheme()
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
      fontSize: 16,
    },
    contentEmailContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contentEmail: {
      flex: 1,
      flexWrap: 'wrap',
      fontSize: 16,
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
        content: <Text style={styles.contentText}>{t('Unified.Steps.ScanOrTakePhotos')}</Text>,
        onPress: () => goToStep1(),
        testIDKey: 'Step1',
      },
      {
        title: 'Step 2',
        active: false,
        complete: true,
        content: (
          <Text style={styles.contentText}>Address: Residential address from your BC Services Card will be used</Text>
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
            <Text style={styles.contentEmail}>Email: j.lee-martinez@email.com</Text>
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
        content: <Text style={styles.contentText}>Verify identity by April 20, 2025</Text>,
        onPress: () => null,
        testIDKey: 'Step4',
      },
    ]
  }, [styles, t, goToStep1])

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
                { backgroundColor: item.active ? '#f2f8ff' : ColorPallet.brand.secondaryBackground },
              ]}
            >
              <View style={styles.titleRow}>
                <Text style={[TextTheme.headingFour, { marginRight: 16 }]}>{item.title}</Text>
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
