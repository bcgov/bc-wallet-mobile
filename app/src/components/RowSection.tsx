import { useTheme } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { StyleSheet, Text, View, Pressable } from 'react-native'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'

type RowSectionProps = {
  showSectionTitle?: boolean
  sectionTitle?: string
  title: string
  accessibilityLabel?: string
  testID?: string
  children?: string
  showRowSeparator?: boolean
  subContent?: JSX.Element
  onPress?: () => void
  showArrowIcon?: boolean
  showSectionSeparator?: boolean
}
const RowSection = ({
  showSectionTitle,
  sectionTitle,
  title,
  accessibilityLabel,
  testID,
  onPress,
  children,
  showRowSeparator,
  subContent,
  showArrowIcon,
  showSectionSeparator,
}: RowSectionProps) => {
  const { SettingsTheme, TextTheme, ColorPallet } = useTheme()
  const iconSize = 30
  const arrowIcon = <MaterialIcon style={{ paddingLeft: 10 }} name={'keyboard-arrow-right'} size={iconSize} />

  const styles = StyleSheet.create({
    section: {
      backgroundColor: SettingsTheme.groupBackground,
      paddingTop: 24,
    },
    rowTitle: {
      ...TextTheme.headingFour,
      flex: 1,
      fontWeight: 'normal',
      flexWrap: 'wrap',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingBottom: 0,
    },
    sectionHeaderText: {
      flexShrink: 1,
    },
    sectionText: {
      fontWeight: 'normal',
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionSeparator: {
      marginBottom: 10,
    },
    rowSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.secondary,
      marginTop: 10,
    },
  })
  return (
    <>
      {showSectionTitle && (
        <View style={[styles.section, styles.sectionHeader]}>
          <Text style={[TextTheme.headingThree, styles.sectionHeaderText]}>{sectionTitle}</Text>
        </View>
      )}
      <View style={[styles.section]}>
        <Pressable onPress={onPress} accessible={true} accessibilityLabel={accessibilityLabel} testID={testID}>
          <View style={styles.sectionRow}>
            <Text style={styles.rowTitle}>{title}</Text>
            <Text style={[TextTheme.headingFour, styles.sectionText]}>{children}</Text>
            {showArrowIcon && arrowIcon}
          </View>
        </Pressable>
        {subContent}
      </View>

      {showRowSeparator && (
        <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
          <View style={[styles.rowSeparator]}></View>
        </View>
      )}
      {showSectionSeparator && <View style={[styles.sectionSeparator]}></View>}
    </>
  )
}
export default RowSection
