import { useTheme } from '@hyperledger/aries-bifold-core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'

import BulletPoint from './BulletPoint'
import HeaderText from './HeaderText'
import Progress from './Progress'

export interface PINCreateHeaderProps {
  updatePin?: boolean
}

const PINCreateHeader = ({ updatePin }: PINCreateHeaderProps) => {
  const { TextTheme, ColorPallet } = useTheme()
  const { t } = useTranslation()
  const styles = StyleSheet.create({
    containerMargin: {
      marginBottom: 16,
    },
    pinBodyTitle: {
      ...TextTheme.normal,
      fontWeight: 'bold',
    },
    pinBodyParagraph: {
      ...TextTheme.normal,
    },
    footerLink: {
      color: ColorPallet.brand.primary,
      marginBottom: 32,
    },
    headerTitle: {
      marginBottom: 16,
      marginTop: !updatePin ? 20 : 0,
    },
  })
  return (
    <View>
      {!updatePin && (
        <View style={{ marginTop: 25 }}>
          <View style={{ marginHorizontal: 50 }}>
            <Progress progressPercent={66.6666} progressText={t('PINCreate.ProgressBarText')} progressFill="primary" />
          </View>
        </View>
      )}
      <View style={styles.headerTitle}>
        <HeaderText title={updatePin ? t('Screens.ChangePIN') : t('Screens.CreatePIN')} />
      </View>
      <Text style={[styles.pinBodyTitle, styles.containerMargin]}>
        {updatePin ? t('PINCreate.RememberChangePIN') : t('PINCreate.RememberPIN')}
      </Text>
      <Text style={[styles.pinBodyParagraph, styles.containerMargin]}>{t('PINCreate.Warning')}</Text>
      <BulletPoint text={t('PINCreate.BulletPoint1')} />
      <BulletPoint text={t('PINCreate.BulletPoint2')} style={{ marginBottom: !updatePin ? 16 : 32 }} />
      {!updatePin && <Text style={[styles.pinBodyParagraph, styles.footerLink]}>{t('PINCreate.MoreInformation')}</Text>}
    </View>
  )
}

export default PINCreateHeader
