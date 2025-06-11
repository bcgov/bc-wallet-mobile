import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'
import React, { useEffect, useState } from 'react'
import { Link, testIdWithKey, Text, ThemedText, useTheme } from '@bifold/core'
import { useMemo } from 'react'

import { Pressable, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'

type SetupSetsScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.SetupSteps>
  route: { params: { stepIndex: number } }
}
const SetupSetsScreen: React.FC<SetupSetsScreenProps> = ({ navigation, route }) => {
  console.log('SetupSetsScreen rendered')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  useEffect(() => {
    const fetchData = async () => {
      // go into store and fetch data to determine which steps to show filled
    }
    fetchData()
  }, [])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    itemSeparator: {
      width: '100%',
      height: 4,
      backgroundColor: ColorPallet.grayscale.black,
    },
    step: {
      paddingVertical: 24,
      paddingHorizontal: 24,
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

  // const steps: SetupStep[] = useMemo(() => {
  //   return [
  //     {
  //       title: 'Step 1',
  //       active: true,
  //       complete: false,
  //       content: (
  //         <ThemedText style={[styles.contentText, { color: ColorPallet.brand.text }]}>
  //           {t('Unified.Steps.ScanOrTakePhotos')}
  //         </ThemedText>
  //       ),
  //       onPress: () => goToEvidenceCollectionStep(),
  //       testIDKey: 'Step1',
  //     },
  //     {
  //       title: 'Step 2',
  //       active: false,
  //       complete: true,
  //       content: (
  //         <ThemedText style={styles.contentText}>
  //           Address: Residential address from your BC Services Card will be used
  //         </ThemedText>
  //       ),
  //       onPress: () => null,
  //       testIDKey: 'Step2',
  //     },
  //     {
  //       title: 'Step 3',
  //       active: false,
  //       complete: true,
  //       content: (
  //         <View style={styles.contentEmailContainer}>
  //           <ThemedText style={styles.contentEmail}>Email: j.lee-martinez@email.com</ThemedText>
  //           <View style={styles.contentEmailButton}>
  //             <Link style={{ textDecorationLine: 'none' }} linkText={'Edit'} onPress={() => null} />
  //           </View>
  //         </View>
  //       ),
  //       onPress: () => null,
  //       testIDKey: 'Step3',
  //     },
  //     {
  //       title: 'Step 4',
  //       active: false,
  //       complete: false,
  //       content: <ThemedText style={styles.contentText}>Verify identity by April 20, 2025</ThemedText>,
  //       onPress: () => null,
  //       testIDKey: 'Step4',
  //     },
  //   ]
  // }, [styles, t, ColorPallet.brand.text])

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          console.log('Step 1 pressed')
        }}
        accessible={false}
        testID={testIdWithKey('')}
        accessibilityLabel={'Step 1'}
      >
        <View
          style={[styles.step, { backgroundColor: false ? ColorPallet.brand.primary : ColorPallet.grayscale.white }]}
        >
          <View style={styles.titleRow}>
            <ThemedText variant={'headingFour'} style={{ marginRight: 16, color: ColorPallet.grayscale.black }}>
              {'Step 1'}
            </ThemedText>
            {true ? <Icon name={'check-circle'} size={24} color={ColorPallet.semantic.success} /> : null}
          </View>
          <View>
            <Text style={{ color: ColorPallet.grayscale.black }}>{'Where does this end up'}</Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.itemSeparator} />
    </View>
  )
}

export default SetupSetsScreen
