import { ButtonLocation, IconButton, testIdWithKey, useTheme } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, Platform } from 'react-native'

interface FauxHeaderProps {
  title: string
  onBackPressed: () => void
}

const FauxHeader: React.FC<FauxHeaderProps> = ({ title, onBackPressed }) => {
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()
  const styles = StyleSheet.create({
    header: {
      backgroundColor: ColorPallet.brand.primary,
      elevation: 0,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 6,
      shadowColor: ColorPallet.grayscale.black,
      shadowOpacity: 0.15,
      borderBottomWidth: 0,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: Platform.OS === 'ios' ? 44 : 56,
    },
    left: {
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    titleContainer: {
      marginHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 1,
      maxWidth: '68%',
      width: '100%',
    },
    title: {
      ...TextTheme.headerTitle,
      textAlign: 'center',
    },
    right: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
  })

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <IconButton
          buttonLocation={ButtonLocation.Left}
          accessibilityLabel={t('Global.Back')}
          testID={testIdWithKey('BackButton')}
          onPress={onBackPressed}
          icon="chevron-left"
        />
      </View>
      <View style={styles.titleContainer}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {title}
        </Text>
      </View>
      <View style={styles.right}></View>
    </View>
  )
}

export default FauxHeader
