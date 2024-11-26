import { GenericFn, testIdWithKey, useTheme } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, useWindowDimensions, StyleSheet, TouchableOpacity } from 'react-native'
import Toast from 'react-native-toast-message'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface BaseToastProps {
  title?: string
  body?: string
  toastType: string
  onPress?: GenericFn
  onShow?: GenericFn
  onHide?: GenericFn
  onCancel?: GenericFn
}

export enum ToastType {
  Success = 'success',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

const BaseToast: React.FC<BaseToastProps> = ({ title, body, toastType, onPress = () => null, onCancel }) => {
  const { TextTheme, borderRadius, ColorPallet } = useTheme()
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const iconSize = 24
  let backgroundColor = ''
  let borderColor = ''
  const iconColor = ColorPallet.grayscale.white
  const textColor = ColorPallet.grayscale.white
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius,
      padding: 16,
    },
    textContainer: {
      flexShrink: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: TextTheme.bold.fontWeight,
    },
  })
  switch (toastType) {
    case ToastType.Success:
      backgroundColor = ColorPallet.notification.success
      borderColor = ColorPallet.notification.successBorder
      break

    case ToastType.Info:
      backgroundColor = ColorPallet.brand.primary
      borderColor = ColorPallet.brand.primary
      break

    case ToastType.Warn:
      backgroundColor = ColorPallet.notification.warn
      borderColor = ColorPallet.notification.warnBorder
      break

    case ToastType.Error:
      backgroundColor = ColorPallet.semantic.error
      borderColor = ColorPallet.semantic.error
      break

    default:
      throw new Error('ToastType was not set correctly.')
  }

  return (
    <TouchableOpacity activeOpacity={1} onPress={() => onPress()}>
      <View style={[styles.container, { backgroundColor, borderColor, width: width - width * 0.1 }]}>
        <View style={{ flex: 2, flexDirection: 'row' }}>
          <View style={styles.textContainer}>
            <Text style={[TextTheme.normal, styles.title, { color: textColor }]} testID={testIdWithKey('ToastTitle')}>
              {title}
            </Text>
            {body && (
              <Text style={[TextTheme.normal, { color: textColor }]} testID={testIdWithKey('ToastBody')}>
                {body}
              </Text>
            )}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ alignSelf: 'flex-end' }}
            onPress={() => {
              if (typeof onCancel !== 'undefined') onCancel()
              Toast.hide()
            }}
          >
            {typeof onCancel !== 'undefined' ? (
              <Text style={[TextTheme.labelTitle, { color: textColor }]}>{t('Global.Cancel')}</Text>
            ) : (
              <Icon name={'close'} color={iconColor} size={iconSize} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default BaseToast
