import { useTheme } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { Image, StyleSheet, Text, View, ImageSourcePropType } from 'react-native'

type InfosDisplayProps = {
  title?: string
  screen?: Array<string>
  detail?: string
  visual?: ImageSourcePropType
  question?: string
  answer?: string
}

const InfosDisplay: React.FC<InfosDisplayProps> = ({ title, detail, visual, question, answer }) => {
  const { SettingsTheme, TextTheme, ColorPallet } = useTheme()

  const styles = StyleSheet.create({
    section: {
      backgroundColor: SettingsTheme.groupBackground,
      paddingTop: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingBottom: 0,
    },
    sectionHeaderText: {
      marginTop: 16,
      flexShrink: 1,
    },
    sectionText: {
      fontWeight: 'normal',
      paddingTop: 16,
      marginBottom: 14,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ImgRow: {
      width: '100%',
      height: '100%',
      borderRadius: 10,
    },
    imgContainer: {
      height: '100%',
      width: '100%',
      borderRadius: 20,
      backgroundColor: ColorPallet.brand.secondary,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    sectionContainer: {
      marginVertical: 16,
      height: 240,
      width: '100%',
      borderRadius: 10,
      shadowColor: ColorPallet.grayscale.darkGrey,
      shadowOffset: {
        width: 6,
        height: 6,
      },
      elevation: 6,
      shadowOpacity: 0.6,
      shadowRadius: 10,
    },
  })
  return (
    <View style={[styles.section]}>
      <View>
        <Text style={[TextTheme.headingThree, styles.sectionHeaderText]} accessibilityRole="header">
          {title ? title : question}
        </Text>
        <Text style={[TextTheme.headingFour, styles.sectionText]}>{detail ? detail : answer}</Text>
      </View>
      {visual && (
        <View style={styles.sectionContainer}>
          <View style={styles.imgContainer}>
            <Image source={visual} style={styles.ImgRow} />
          </View>
        </View>
      )}
    </View>
  )
}
export default InfosDisplay
