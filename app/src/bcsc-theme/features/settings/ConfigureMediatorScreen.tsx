import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { ListButton, ListButtonGroup } from '@/bcsc-theme/components/ListButton'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useConfigureMediatorViewModel } from './useConfigureMediatorViewModel'

type ConfigureMediatorScreenProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.ConfigureMediator>

/**
 * Developer-mode picker for the mediator the wallet routes its messages through.
 */
export const ConfigureMediatorScreen: React.FC<ConfigureMediatorScreenProps> = ({ route }) => {
  const { Spacing, ColorPalette } = useTheme()
  const { mediators, switchingTo, descriptionText, scanButtonText, selectMediator, scanMediator } =
    useConfigureMediatorViewModel(route.params?.scannedMediatorUri)
  const switching = switchingTo !== null

  const styles = StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      gap: Spacing.md,
      padding: Spacing.lg,
    },
    group: {
      gap: Spacing.xs / 2,
      borderRadius: Spacing.sm,
      overflow: 'hidden',
    },
    row: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    names: {
      flex: 1,
      gap: Spacing.xs / 2,
    },
    text: {
      color: ColorPalette.brand.headerText,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        title={scanButtonText}
        buttonType={ButtonType.Secondary}
        onPress={scanMediator}
        accessibilityLabel={scanButtonText}
        testID={testIdWithKey(TestIds.main.configureMediator.scan)}
        disabled={switching}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.scrollContainer} padded={false}>
      <ThemedText>{descriptionText}</ThemedText>
      <View style={styles.group}>
        <ListButtonGroup>
          {mediators.map(({ url, label, host, selected }) => (
            <ListButton
              key={url}
              onPress={() => selectMediator(url)}
              disabled={switching}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: switching }}
              accessibilityLabel={label}
              testID={testIdWithKey(`${TestIds.main.configureMediator.mediatorRowPrefix}${label}`)}
            >
              <View style={styles.row}>
                <View style={styles.names}>
                  <ThemedText style={styles.text}>{label}</ThemedText>
                  {host !== label ? (
                    <ThemedText variant="labelSubtitle" style={styles.text}>
                      {host}
                    </ThemedText>
                  ) : null}
                </View>
                {switchingTo === url ? <ActivityIndicator color={ColorPalette.brand.primary} /> : null}
                {selected ? <Icon name="check" size={24} color={ColorPalette.brand.primary} /> : null}
              </View>
            </ListButton>
          ))}
        </ListButtonGroup>
      </View>
    </ScreenWrapper>
  )
}
