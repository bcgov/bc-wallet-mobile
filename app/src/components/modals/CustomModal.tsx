import { Button, ButtonType, testIdWithKey, useTheme } from '@hyperledger/aries-bifold-core'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

import { hitSlop } from '../../constants'
import HeaderText from '../HeaderText'

export interface CustomModalProps {
  title: string
  onDismissPressed: () => void
  description?: string
  primary?: {
    label: string
    action: () => void
  }
  secondary?: {
    label: string
    action: () => void
  }
}

export const CustomModal = ({ title, description, primary, secondary, onDismissPressed }: CustomModalProps) => {
  const { height, width } = useWindowDimensions()
  const { TextTheme, ColorPallet } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    modalCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 100,
      backgroundColor: ColorPallet.notification.popupOverlay,
      minHeight: height,
      maxHeight: height,
      minWidth: width,
    },
    container: {
      padding: 20,
      minWidth: width - 2 * 25,
      backgroundColor: ColorPallet.brand.primaryBackground,
      shadowColor: ColorPallet.grayscale.darkGrey,
      shadowOffset: {
        width: 3,
        height: 3,
      },
      shadowOpacity: 0.6,
      elevation: 5,
    },
    scrollViewStyle: {
      flexGrow: 0,
    },
    titleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    bodyText: {
      ...TextTheme.normal,
      paddingVertical: 16,
      color: ColorPallet.notification.infoText,
    },
    ActionContainer: {
      paddingTop: 10,
    },
  })

  return (
    <Modal transparent accessibilityViewIsModal>
      <TouchableOpacity onPress={onDismissPressed} accessible={false}>
        <View style={styles.modalCenter}>
          <TouchableWithoutFeedback accessible={false}>
            <View style={styles.container}>
              <View style={styles.titleContainer}>
                <HeaderText title={title} />
                <TouchableOpacity
                  onPress={onDismissPressed}
                  testID={testIdWithKey('Close')}
                  accessibilityLabel={t('Global.Close')}
                  accessibilityRole={'button'}
                  hitSlop={hitSlop}
                >
                  <Icon name={'clear'} size={30} color={ColorPallet.notification.infoIcon} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollViewStyle}>
                <View onStartShouldSetResponder={() => true}>
                  <Text style={styles.bodyText} testID={testIdWithKey('BodyText')}>
                    {description}
                  </Text>
                </View>
              </ScrollView>
              <View style={styles.ActionContainer}>
                <Button
                  title={primary?.label ?? secondary?.label ?? t('Global.Close')}
                  accessibilityLabel={primary?.label ?? secondary?.label ?? t('Global.Close')}
                  testID={testIdWithKey('ModalPrimaryAction')}
                  buttonType={ButtonType.Primary}
                  onPress={primary?.action ?? secondary?.action ?? onDismissPressed}
                />
              </View>
              {primary && secondary && (
                <View style={styles.ActionContainer}>
                  <Button
                    title={secondary.label}
                    accessibilityLabel={secondary.label}
                    testID={testIdWithKey('ModalSecondaryAction')}
                    onPress={secondary.action}
                    buttonType={ButtonType.Secondary}
                  />
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
