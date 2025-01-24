import { Button, ButtonType, DispatchAction, testIdWithKey, useStore, useTheme } from '@hyperledger/aries-bifold-core'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View, Switch, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import HeaderText from '../components/HeaderText'
import { Screens, SettingStackParams } from '../navigators/navigators'

type ToursProps = StackScreenProps<SettingStackParams>

const Tours: React.FC<ToursProps> = ({ navigation }) => {
  const [store, dispatch] = useStore()

  const { t } = useTranslation()
  const [tourEnabled, setTourEnabled] = useState(!!store.tours.enableTours)
  const { ColorPallet, TextTheme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      height: '100%',
      padding: 20,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    switchContent: {
      flexDirection: 'row',
      marginVertical: 20,
      justifyContent: 'space-between',
    },
    image: {
      minWidth: 200,
      minHeight: 200,
      marginBottom: 66,
    },
    useToUnlockContainer: {
      flexShrink: 1,
      marginRight: 10,
      justifyContent: 'center',
    },
    biometryAvailableGap: {
      rowGap: 16,
    },
    relaunchButton: {
      marginTop: 40,
      margin: 20,
    },
  })

  const toggleSwitch = () => {
    dispatch({
      type: DispatchAction.ENABLE_TOURS,
      payload: [!tourEnabled],
    })
    setTourEnabled(!tourEnabled)
  }
  const resetTours = () => {
    dispatch({
      type: DispatchAction.UPDATE_SEEN_HOME_TOUR,
      payload: [false],
    })
    dispatch({
      type: DispatchAction.UPDATE_SEEN_CREDENTIALS_TOUR,
      payload: [false],
    })
    dispatch({
      type: DispatchAction.UPDATE_SEEN_CREDENTIAL_OFFER_TOUR,
      payload: [false],
    })
    dispatch({
      type: DispatchAction.UPDATE_SEEN_PROOF_REQUEST_TOUR,
      payload: [false],
    })
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        <HeaderText title={t('TourScreen.Title')} />
        <View style={{ marginTop: 20 }}>
          <View style={styles.biometryAvailableGap}>
            <Text style={TextTheme.normal}>{t('TourScreen.Text1')}</Text>
            <Text style={TextTheme.normal}>{t('TourScreen.Text2')}</Text>
          </View>
        </View>
        <View style={styles.switchContent}>
          <View style={styles.useToUnlockContainer}>
            <Text style={TextTheme.bold}>{t('TourScreen.SwitchText')}</Text>
          </View>
          <View style={{ justifyContent: 'center' }}>
            <Pressable
              testID={testIdWithKey('ToggleTours')}
              accessible
              accessibilityLabel={tourEnabled ? t('TourScreen.On') : t('TourScreen.Off')}
              accessibilityRole={'switch'}
            >
              <Switch
                trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
                thumbColor={tourEnabled ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
                ios_backgroundColor={ColorPallet.grayscale.lightGrey}
                onValueChange={toggleSwitch}
                value={tourEnabled}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.relaunchButton}>
          {store.tours.enableTours && (
            <Button
              title={t('TourScreen.TourActivateButton')}
              accessibilityLabel={t('TourScreen.TourActivateButton')}
              testID={testIdWithKey('Relancé')}
              onPress={() => {
                navigation.navigate(Screens.Settings)
                resetTours()
              }}
              buttonType={ButtonType.Secondary}
            ></Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Tours
