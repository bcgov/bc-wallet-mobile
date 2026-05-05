import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, ThemedText, testIdWithKey, useTheme } from '@bifold/core'
import { useConnectionById } from '@bifold/react-hooks'
import { DidCommCredentialState } from '@credo-ts/didcomm'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, View } from 'react-native'

interface RemoveContactScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.RemoveContact>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.RemoveContact>
}

const RemoveContactScreen = ({ navigation, route }: RemoveContactScreenProps) => {
  const { connectionId } = route.params
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { agent } = useBCSCAgent()
  const connection = useConnectionById(connectionId)
  const [submitting, setSubmitting] = useState(false)

  const onConfirmRemove = useCallback(async () => {
    if (!agent || !connection || submitting) {return}
    setSubmitting(true)
    try {
      const [basicMessages, proofs, offers] = await Promise.all([
        agent.modules.didcomm.basicMessages.findAllByQuery({ connectionId: connection.id }),
        agent.modules.didcomm.proofs.findAllByQuery({ connectionId: connection.id }),
        agent.modules.didcomm.credentials.findAllByQuery({
          connectionId: connection.id,
          state: DidCommCredentialState.OfferReceived,
        }),
      ])
      await Promise.allSettled([
        ...proofs.map((p: { id: string }) => agent.modules.didcomm.proofs.deleteById(p.id)),
        ...offers.map((o: { id: string }) => agent.modules.didcomm.credentials.deleteById(o.id)),
        ...basicMessages.map((m: { id: string }) => agent.modules.didcomm.basicMessages.deleteById(m.id)),
        agent.modules.didcomm.connections.deleteById(connection.id),
      ])
      // Pop both this modal and the details screen so we land on the list.
      navigation.popToTop()
      navigation.navigate(BCSCScreens.Contacts)
    } catch (err) {
      Alert.alert(t('BCSC.Contacts.Remove.FailureTitle'), (err as Error).message)
      setSubmitting(false)
    }
  }, [agent, connection, navigation, submitting, t])

  const styles = StyleSheet.create({
    title: {
      color: ColorPalette.brand.primary,
      marginBottom: Spacing.md,
    },
    paragraph: {
      marginBottom: Spacing.md,
    },
    bulletRow: {
      flexDirection: 'row',
      paddingLeft: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    bulletGlyph: {
      marginRight: Spacing.sm,
    },
    bulletText: {
      flex: 1,
    },
    actions: {
      gap: Spacing.sm,
      marginTop: Spacing.lg,
    },
  })

  const bullets = [
    t('BCSC.Contacts.Remove.Bullet1'),
    t('BCSC.Contacts.Remove.Bullet2'),
    t('BCSC.Contacts.Remove.Bullet3'),
    t('BCSC.Contacts.Remove.Bullet4'),
  ]

  return (
    <ScreenWrapper>
      <ThemedText variant="headingThree" style={styles.title}>
        {t('BCSC.Contacts.Remove.Title')}
      </ThemedText>
      <ThemedText style={styles.paragraph}>{t('BCSC.Contacts.Remove.WarningTop')}</ThemedText>
      <ThemedText variant="bold" style={styles.paragraph}>
        {t('BCSC.Contacts.Remove.NoLongerAble')}
      </ThemedText>
      {bullets.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <ThemedText style={styles.bulletGlyph}>{'•'}</ThemedText>
          <ThemedText style={styles.bulletText}>{line}</ThemedText>
        </View>
      ))}
      <ThemedText style={[styles.paragraph, { marginTop: Spacing.md }]}>
        {t('BCSC.Contacts.Remove.WarningBottom')}
      </ThemedText>
      <View style={styles.actions}>
        <Button
          title={t('BCSC.Contacts.Remove.RemoveContact')}
          buttonType={ButtonType.Critical}
          onPress={onConfirmRemove}
          disabled={submitting}
          accessibilityLabel={t('BCSC.Contacts.Remove.RemoveContact')}
          testID={testIdWithKey('ConfirmRemove')}
        />
        <Button
          title={t('Global.Cancel')}
          buttonType={ButtonType.Secondary}
          onPress={() => navigation.goBack()}
          accessibilityLabel={t('Global.Cancel')}
          testID={testIdWithKey('CancelRemove')}
        />
      </View>
    </ScreenWrapper>
  )
}

export default RemoveContactScreen
