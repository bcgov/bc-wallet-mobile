import { useTheme } from '@hyperledger/aries-bifold-core'
import { StyleSheet } from 'react-native'

const useHistoryDetailPageStyles = () => {
  const { ColorPallet } = useTheme()

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    contentContainer: {
      height: '100%',
      padding: 20,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    subTitle: {
      marginBottom: 20,
      color: ColorPallet.grayscale.mediumGrey,
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
    detailRow: {
      marginBottom: 8,
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.secondary,
    },
    detailLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 14,
      color: ColorPallet.grayscale.mediumGrey,
    },
    card: {
      backgroundColor: ColorPallet.grayscale.veryLightGrey,
      padding: 15,
      gap: 16,
      justifyContent: 'flex-start',
      // Ombre portée équivalente à `box-shadow`
      shadowColor: 'rgba(34, 54, 84, 0.24)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      // Pour Android, car `shadow*` ne fonctionne pas sur Android
      elevation: 4,
    },
    verticalBar: {
      width: 40,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
    },
    cardSubtitle: {
      fontSize: 14,
      color: ColorPallet.grayscale.mediumGrey,
      textAlign: 'right',
      marginLeft: 8,
    },
    detailsContainer: {
      paddingBottom: 34,
    },
    cardContent: {
      marginLeft: 16,
      paddingLeft: 16,
      textAlign: 'left',
      justifyContent: 'flex-start',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    cardSubtitleName: {
      fontSize: 14,
      color: ColorPallet.grayscale.mediumGrey,
    },
    cardSubtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
      right: 0,
      textAlign: 'right',
      justifyContent: 'flex-end',
    },
    date: {
      fontSize: 14,
      color: ColorPallet.grayscale.mediumGrey,
      marginBottom: 20,
    },
  })
}

export default useHistoryDetailPageStyles
