import { TestIds } from '@/test-ids/registry'
import { AlertAction } from '@/utils/alert'
import { testIdWithKey } from '@bifold/core'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { colors, ModalCard, modalCardStyles } from './ModalCard'

// Half the gap between the stacked buttons, so a press can't land on the neighbouring button
const BUTTON_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 }

// Same button styles as the error card: 'cancel' is the secondary button, 'default' the primary
const buttonStyles = {
  default: { button: modalCardStyles.primaryButton, text: modalCardStyles.primaryButtonText },
  cancel: { button: modalCardStyles.secondaryButton, text: modalCardStyles.secondaryButtonText },
  destructive: { button: modalCardStyles.destructiveButton, text: modalCardStyles.destructiveButtonText },
}

export interface AlertCardProps {
  title: string
  description: string
  actions: AlertAction[]
  onAction: (action: AlertAction) => void
}

/**
 * The alert's card: title, description, then one button per action.
 */
export const AlertCard: React.FC<AlertCardProps> = ({ title, description, actions, onAction }) => (
  <ModalCard
    title={title}
    titleTestID={testIdWithKey(TestIds.alertModal.title)}
    icon={<Icon name="info" size={30} color={colors.infoIcon} style={modalCardStyles.icon} />}
  >
    <Text style={modalCardStyles.bodyText} testID={testIdWithKey(TestIds.alertModal.body)}>
      {description}
    </Text>
    <View style={[modalCardStyles.buttons, styles.buttons]}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={`${action.text}-${index}`}
          accessibilityLabel={action.text}
          accessibilityRole="button"
          hitSlop={BUTTON_HIT_SLOP}
          testID={testIdWithKey(`${TestIds.alertModal.action}${index}`)}
          style={buttonStyles[action.style ?? 'default'].button}
          onPress={() => onAction(action)}
          activeOpacity={0.8}
        >
          <Text style={buttonStyles[action.style ?? 'default'].text}>{action.text}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </ModalCard>
)

const styles = StyleSheet.create({
  // More room above the first button than the error card's details toggle needs: 24 with the text's margin
  buttons: { paddingTop: 16 },
})
