import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

export enum CameraIssueType {
  CAMERA_MISSING = 'camera_missing',
  CAMERA_ERROR = 'camera_error',
}

interface CameraIssueProps {
  title: string
  description: string
}

export const CameraIssue = (props: CameraIssueProps) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    cameraErrorBlock: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
    },
    instructionText: {
      color: ColorPalette.grayscale.white,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '700',
    },
    instructionSubText: {
      color: ColorPalette.grayscale.white,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '400',
    },
    icon: {
      marginBottom: Spacing.sm,
    },
  })

  return (
    <View style={styles.cameraErrorBlock}>
      <Icon name={'no-photography'} size={80} color={ColorPalette.grayscale.white} style={styles.icon} />
      <ThemedText style={styles.instructionText}>{props.title}</ThemedText>
      <ThemedText style={styles.instructionSubText}>{props.description}</ThemedText>
    </View>
  )
}
