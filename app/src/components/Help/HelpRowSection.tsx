import { useTheme } from '@hyperledger/aries-bifold-core'
import { NavigationProp } from '@react-navigation/native'
import React from 'react'
import { StyleSheet, Text, View, Pressable, ImageSourcePropType } from 'react-native'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'

import { HelpCenterStackParams, Screens } from '../../navigators/navigators'

type ItemSection = {
  title?: string
  screen: Array<string>
  text?: string
  visual?: ImageSourcePropType
  question?: string
  answer?: string
}

type ItemSectionType = {
  title: string
  content: ItemSection[]
}

type HelpRowSectionProps = {
  showSectionTitle?: boolean
  sectionTitle?: string
  itemSection: ItemSectionType[]
  accessibilityLabel?: string
  testID?: string
  children?: string
  showRowSeparator?: boolean
  subContent?: JSX.Element
  onPress?: () => void
  showArrowIcon?: boolean
  showSectionSeparator?: boolean
  navigation: NavigationProp<HelpCenterStackParams>
}
const HelpRowSection = ({
  showSectionTitle,
  sectionTitle,
  itemSection = [],
  accessibilityLabel,
  testID,
  children,
  showRowSeparator,
  subContent,
  showArrowIcon,
  navigation,
}: HelpRowSectionProps) => {
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
      {itemSection.map((item, index) => (
        <View key={index}>
          <View style={[styles.section]}>
            <Pressable
              onPress={() =>
                navigation.navigate(Screens.HelpCenterPage, { selectedSection: itemSection, sectionNo: index })
              }
              accessible={true}
              accessibilityLabel={accessibilityLabel}
              testID={testID}
            >
              <View style={styles.sectionRow}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={[TextTheme.headingFour, styles.sectionText]}>{children}</Text>
                {showArrowIcon && arrowIcon}
              </View>
            </Pressable>
            {subContent}
          </View>
          {showRowSeparator && index < itemSection.length - 1 && (
            <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
              <View style={[styles.rowSeparator]}></View>
            </View>
          )}
        </View>
      ))}
      <View style={[styles.sectionSeparator]}></View>
    </>
  )
}
export default HelpRowSection
