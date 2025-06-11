import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'
import React from 'react'
import { testIdWithKey, Text, ThemedText, useStore, useTheme } from '@bifold/core'

import { Pressable, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { BCState } from '@/store'

type SetupSetsScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.SetupSteps>
  route: { params: { stepIndex: number } }
}
const SetupSetsScreen: React.FC<SetupSetsScreenProps> = ({ navigation, route }) => {
  console.log('SetupSetsScreen rendered')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  const { t } = useTranslation()
  const { ColorPallet } = useTheme()
  const [store, dispatch] = useStore<BCState>()

  const serialNumber = store.bcsc.serial ?? null
  const emailAddress = store.bcsc.email ?? null
  const residentialAddress = store.bcsc.address ?? null

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPallet.grayscale.white,
    },
    itemSeparator: {
      width: '100%',
      height: 2,
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

  const handleOnPress = (shouldNavigate: boolean) => {
    if (shouldNavigate) {
      nextStep(navigation, stepIndex)
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          handleOnPress(!serialNumber)
        }}
        accessible={false}
        testID={testIdWithKey('Step1')}
        accessibilityLabel={'Step 1'}
      >
        <View
          style={[
            styles.step,
            { backgroundColor: Boolean(serialNumber) ? ColorPallet.grayscale.white : ColorPallet.brand.primary },
          ]}
        >
          <View style={styles.titleRow}>
            <ThemedText variant={'headingFour'} style={{ marginRight: 16, color: ColorPallet.grayscale.black }}>
              {'Step 1'}
            </ThemedText>
            {Boolean(serialNumber) ? (
              <Icon name={'check-circle'} size={24} color={ColorPallet.semantic.success} />
            ) : null}
          </View>
          <View>
            <Text style={{ color: ColorPallet.brand.text }}>
              {Boolean(serialNumber) ? `ID: ${serialNumber}` : t('Unified.Steps.ScanOrTakePhotos')}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.itemSeparator} />
      <Pressable
        onPress={() => {
          handleOnPress(Boolean(serialNumber) && !residentialAddress)
        }}
        accessible={false}
        testID={testIdWithKey('Step2')}
        accessibilityLabel={'Step 2'}
      >
        <View
          style={[
            styles.step,
            {
              backgroundColor:
                Boolean(serialNumber) && !residentialAddress ? ColorPallet.brand.primary : ColorPallet.grayscale.white,
            },
          ]}
        >
          <View style={styles.titleRow}>
            <ThemedText variant={'headingFour'} style={{ marginRight: 16, color: ColorPallet.grayscale.black }}>
              {'Step 2'}
            </ThemedText>
            {Boolean(serialNumber) && Boolean(residentialAddress) ? (
              <Icon name={'check-circle'} size={24} color={ColorPallet.semantic.success} />
            ) : null}
          </View>
          <View>
            <Text style={{ color: ColorPallet.grayscale.black }}>
              {Boolean(residentialAddress) ? 'Address collected from: CARD_TYPE' : 'Add residential address'}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.itemSeparator} />
      <Pressable
        onPress={() => {
          handleOnPress(Boolean(serialNumber) && Boolean(residentialAddress) && !emailAddress)
        }}
        accessible={false}
        testID={testIdWithKey('Step3')}
        accessibilityLabel={'Step 3'}
      >
        <View
          style={[
            styles.step,
            {
              backgroundColor:
                Boolean(serialNumber) && Boolean(residentialAddress) && !emailAddress
                  ? ColorPallet.brand.primary
                  : ColorPallet.grayscale.white,
            },
          ]}
        >
          <View style={styles.titleRow}>
            <ThemedText variant={'headingFour'} style={{ marginRight: 16, color: ColorPallet.grayscale.black }}>
              {'Step 3'}
            </ThemedText>
            {Boolean(serialNumber) && Boolean(emailAddress) && Boolean(residentialAddress) ? (
              <Icon name={'check-circle'} size={24} color={ColorPallet.semantic.success} />
            ) : null}
          </View>
          <View>
            <Text style={{ color: ColorPallet.grayscale.black }}>
              {Boolean(emailAddress) ? `Email: ${emailAddress}` : 'Email Address'}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.itemSeparator} />
      <Pressable
        onPress={() => {
          console.log('Step 4 pressed')
        }}
        accessible={false}
        testID={testIdWithKey('Step4')}
        accessibilityLabel={'Step 4'}
      >
        <View
          style={[
            styles.step,
            {
              backgroundColor:
                Boolean(serialNumber) && Boolean(emailAddress) && Boolean(residentialAddress)
                  ? ColorPallet.brand.primary
                  : ColorPallet.grayscale.white,
            },
          ]}
        >
          <View style={styles.titleRow}>
            <ThemedText variant={'headingFour'} style={{ marginRight: 16, color: ColorPallet.grayscale.black }}>
              {'Step 4'}
            </ThemedText>
          </View>
          <View>
            <Text style={{ color: ColorPallet.grayscale.black }}>{'7 days from now'}</Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.itemSeparator} />
    </View>
  )
}

export default SetupSetsScreen
