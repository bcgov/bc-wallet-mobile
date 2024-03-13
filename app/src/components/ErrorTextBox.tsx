import { useTheme } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface ErrorTextBoxProps {
  children: React.ReactElement | string
}

const iconSize = 30
const offset = 10

const ErrorTextBox: React.FC<ErrorTextBoxProps> = ({ children }) => {
  const { ColorPallet, TextTheme } = useTheme()
  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.notification.error,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: ColorPallet.notification.errorBorder,
      paddingHorizontal: 10,
      paddingVertical: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    textContainer: {
      ...TextTheme.normal,
      color: ColorPallet.notification.errorText,
      alignSelf: 'center',
      flexShrink: 1,
    },
    iconContainer: {
      marginRight: offset,
      alignSelf: 'flex-start',
    },
  })
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Icon name={'error'} size={iconSize} color={ColorPallet.notification.errorIcon} />
        </View>
        {typeof children === 'string' ? <Text style={styles.textContainer}>{children}</Text> : <>{children}</>}
      </View>
    </View>
  )
}

export default ErrorTextBox
