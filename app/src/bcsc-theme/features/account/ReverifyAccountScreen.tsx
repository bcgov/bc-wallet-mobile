import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import AccountVerificationCta from '@assets/img/account-verification-cta.svg'
import { ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import React from 'react'

import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import BulletPointList from '@/components/BulletPointList'

const BULLET_KEYS = [
  'BCSC.ReverifyAccount.BulletOne',
  'BCSC.ReverifyAccount.BulletTwo',
  'BCSC.ReverifyAccount.BulletThree',
  'BCSC.ReverifyAccount.BulletFour',
]
interface ReverifyAccountScreenProps {
  route: RouteProp<BCSCMainStackParams, BCSCScreens.ReverifyAccount>
}

export const ReverifyAccountScreen = ({ route: _route }: ReverifyAccountScreenProps): React.ReactElement => {
  const isExpired = _route.params.isExpired
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const verificationReset = useVerificationReset()
  const { continueVerificationProcess } = useSecureActions()

  const styles = StyleSheet.create({
    iconContainer: {
      alignItems: 'center',
    },
  })

  const title = isExpired ? t('BCSC.ReverifyAccount.ExpiredTitle') : t('BCSC.ReverifyAccount.RenewalTitle')
  return (
    <ActionScreenLayout
      primaryActionText={t('BCSC.ReverifyAccount.PrimaryAction')}
      onPressPrimaryAction={async () => {
        try {
          await verificationReset()
          await continueVerificationProcess()
        } catch (error) {
          logger.error('ReverifyAccountScreen: Error during reset on account re-verification', error as Error)
        }
      }}
    >
      <View style={styles.iconContainer}>
        <AccountVerificationCta width={200} height={200} />
        <ThemedText variant="headingTwo" style={{ textAlign: 'center' }}>
          {title}
        </ThemedText>
      </View>

      <ThemedText>{t('BCSC.ReverifyAccount.Body')}</ThemedText>

      <View>
        <ThemedText variant="headingFour">{t('BCSC.ReverifyAccount.BulletHeader')}</ThemedText>
        <BulletPointList translationKeys={BULLET_KEYS} />
      </View>
    </ActionScreenLayout>
  )
}
