import { Screens, Stacks, TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { HistoryStackParams } from '@hyperledger/aries-bifold-core/App/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const HomeFooter = () => {
  const { t } = useTranslation()
  const { ColorPallet } = useTheme()
  const { navigate } = useNavigation<StackNavigationProp<HistoryStackParams>>()
  const [{ useNotifications }] = useServices([TOKENS.NOTIFICATIONS])
  const notifications = useNotifications()

  const styles = StyleSheet.create({
    footerContainer: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    footerLinkContainer: {
      paddingHorizontal: 32,
    },
    footerLink: {
      color: ColorPallet.brand.primary,
      textDecorationLine: 'underline',
      fontSize: 14,
      fontWeight: '400',
    },
  })

  return (
    <View style={styles.footerContainer}>
      {notifications?.length > 0 && (
        <TouchableOpacity
          style={styles.footerLinkContainer}
          onPress={() => navigate(Stacks.HistoryStack as never, { screen: Screens.HistoryPage } as never)}
        >
          <Text style={styles.footerLink}>{t('Home.SeeAll')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default HomeFooter
