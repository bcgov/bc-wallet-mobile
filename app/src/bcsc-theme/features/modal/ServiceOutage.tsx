import { CardButton } from '@/bcsc-theme/components/CardButton'
import { HELP_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'
import useServiceOutageViewModel from './useServiceOutageViewModel'

export const ServiceOutage = (): React.ReactElement => {
  const { headerText, contentText, buttonText, isCheckDisabled, handleCheckAgain } = useServiceOutageViewModel()
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const navigation = useNavigation()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.modalPrimaryBackground,
    },
    scollContainer: {},
    icon: {
      paddingVertical: Spacing.lg,
      alignSelf: 'center',
    },
    buttonContainer: {
      padding: Spacing.md,
    },
    textContent: {
      lineHeight: 30,
    },
    textContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
  })

  useFocusEffect(
    useCallback(() => {
      const beforeRemove = navigation.addListener('beforeRemove', (event) => {
        if (!event.data.action.source) {
          event.preventDefault()
        }
      })
      return () => {
        beforeRemove()
      }
    }, [navigation])
  )

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <Icon name="error-outline" size={200} color={ColorPalette.brand.icon} style={styles.icon} />
        <View style={styles.textContainer}>
          <ThemedText variant="headingThree">{headerText}</ThemedText>
          {contentText.filter(Boolean).map((text) => (
            <ThemedText key={text} style={styles.textContent}>
              {text}
            </ThemedText>
          ))}
          <CardButton
            title={t('BCSC.Modals.ServiceOutage.LearnMore')}
            onPress={() => Linking.openURL(HELP_URL)}
            endIcon="open-in-new"
            testID={testIdWithKey('ServiceOutageHelpCentre')}
          />
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={buttonText}
          buttonType={ButtonType.Primary}
          onPress={handleCheckAgain}
          disabled={isCheckDisabled}
          accessibilityLabel={buttonText}
          testID={testIdWithKey('ServiceOutageCheckAgain')}
        />
      </View>
    </SafeAreaView>
  )
}
