import { useTheme } from '@hyperledger/aries-bifold-core'
import { StyleSheet } from 'react-native'

const useHistoryDetailPageStyles = () => {
  const { ColorPallet } = useTheme()

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
      padding: 20,
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 20,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    headerStyle: {
      paddingTop: 20,
    },
    subTitle: {
      marginBottom: 20,
      color: ColorPallet.grayscale.mediumGrey,
      fontWeight: 'bold',
    },
    lineSeparator: {
      borderBottomWidth: 1,
      marginHorizontal: 16,
      borderBottomColor: ColorPallet.brand.secondary,
    },
    deleteContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    trashIcon: {
      color: ColorPallet.notification.errorText,
    },
    deleteText: {
      color: ColorPallet.notification.errorText,
    },
    date: {
      fontSize: 14,
      color: ColorPallet.grayscale.mediumGrey,
      marginBottom: 20,
    },
  })
}

export default useHistoryDetailPageStyles
