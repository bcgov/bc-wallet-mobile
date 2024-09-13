import { useTheme } from '@hyperledger/aries-bifold-core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'

const HomeEmptyList = () => {
  const { ColorPallet } = useTheme()
  const { t } = useTranslation()
  const style = StyleSheet.create({
    container: {
      paddingLeft: 16,
      marginVertical: 4,
    },
    text: {
      fontSize: 14,
      fontWeight: '400',
      color: ColorPallet.notification.infoText,
      lineHeight: 20,
    },
  })
  return (
    <View style={style.container}>
      <Text style={style.text}>{t('Home.NoNewUpdates')}</Text>
    </View>
  )
}

export default HomeEmptyList
