import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ErrorCategory, ErrorRegistry, ErrorRegistryKey } from '@/errors/errorRegistry'
import { Button, ButtonType, ScreenWrapper, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface ErrorAlertTestProps {
  onBack: () => void
}

const ErrorAlertTest: React.FC<ErrorAlertTestProps> = ({ onBack }) => {
  const { t } = useTranslation()
  const { TextTheme, ColorPalette, SettingsTheme } = useTheme()
  const { error, errorAsAlert, alert, dismiss } = useErrorAlert()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
      backgroundColor: SettingsTheme.groupBackground,
    },
    headerTitle: {
      ...TextTheme.headingThree,
      flex: 1,
      marginLeft: 12,
    },
    scrollContent: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      ...TextTheme.headingFour,
      marginBottom: 12,
      color: ColorPalette.brand.primary,
    },
    description: {
      ...TextTheme.normal,
      marginBottom: 16,
      opacity: 0.7,
    },
    buttonRow: {
      marginBottom: 12,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: ColorPalette.brand.primaryLight,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    categoryText: {
      ...TextTheme.labelSubtitle,
      color: ColorPalette.brand.primary,
      fontSize: 10,
      textTransform: 'uppercase',
    },
  })

  // Sample errors from different categories to test
  const sampleErrors: { key: ErrorRegistryKey; description: string }[] = [
    { key: 'GENERAL_ERROR', description: 'Generic error for unknown issues' },
    { key: 'NO_INTERNET', description: 'Network connectivity error' },
    { key: 'SERVER_ERROR', description: 'Server-side error' },
    { key: 'SERVER_TIMEOUT', description: 'Request timeout error' },
    { key: 'INVALID_QR_CODE', description: 'QR code scanning error' },
    { key: 'LOGIN_REJECTED_401', description: 'Authentication unauthorized' },
    { key: 'CARD_EXPIRED_WILL_REMOVE', description: 'Credential expiration warning' },
    { key: 'WALLET_SECRET_NOT_FOUND', description: 'Critical wallet error' },
    { key: 'ATTESTATION_CONNECTION_ERROR', description: 'Attestation flow error' },
  ]

  // Sample alerts (non-error alerts) - with pre-translated content
  const sampleAlerts = [
    { title: 'Data Use Warning', body: 'This action may use mobile data. Continue?' },
    { title: 'Update Available', body: 'A new version of the app is available.' },
    { title: 'Confirm', body: 'Are you sure you want to continue?' },
    { title: 'Rate BC Wallet', body: 'Would you like to rate the app in the store?' },
  ]

  const getCategoryIcon = (category: ErrorCategory): string => {
    const icons: Record<ErrorCategory, string> = {
      [ErrorCategory.CAMERA]: 'camera-alt',
      [ErrorCategory.NETWORK]: 'wifi-off',
      [ErrorCategory.AUTHENTICATION]: 'lock',
      [ErrorCategory.CREDENTIAL]: 'badge',
      [ErrorCategory.PROOF]: 'verified',
      [ErrorCategory.CONNECTION]: 'link-off',
      [ErrorCategory.WALLET]: 'account-balance-wallet',
      [ErrorCategory.VERIFICATION]: 'verified-user',
      [ErrorCategory.DEVICE]: 'smartphone',
      [ErrorCategory.STORAGE]: 'storage',
      [ErrorCategory.TOKEN]: 'vpn-key',
      [ErrorCategory.GENERAL]: 'error',
    }
    return icons[category] || 'error'
  }

  const triggerError = (key: ErrorRegistryKey) => {
    error(key, {
      error: new Error(`Test error triggered for: ${key}`),
      context: { source: 'ErrorAlertTest', timestamp: new Date().toISOString() },
    })
  }

  const triggerErrorAsAlert = (key: ErrorRegistryKey) => {
    errorAsAlert(key, {
      error: new Error(`Test alert triggered for: ${key}`),
      actions: [
        { text: t('Global.Cancel'), style: 'cancel' },
        { text: t('Global.Okay'), style: 'default' },
      ],
    })
  }

  const triggerAlert = (title: string, body: string) => {
    alert(title, body, { actions: [{ text: t('Global.Okay'), style: 'default' }] })
  }

  return (
    <ScreenWrapper padded={false} scrollable={false}>
      <View style={styles.header}>
        <Icon
          name="arrow-back"
          size={24}
          color={TextTheme.normal.color}
          onPress={onBack}
          accessibilityLabel={t('Global.Back')}
        />
        <Text style={styles.headerTitle}>{t('Developer.ErrorAlertTest')}</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Error Modal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('Developer.ErrorModals')}</Text>
          <Text style={styles.description}>{t('Developer.ErrorModalsDescription')}</Text>

          {sampleErrors.map(({ key, description }) => {
            const definition = ErrorRegistry[key]
            return (
              <View key={key} style={styles.buttonRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    <Icon name={getCategoryIcon(definition.category)} size={10} /> {definition.category}
                  </Text>
                </View>
                <Button
                  title={`${key} (${definition.code})`}
                  accessibilityLabel={`Trigger ${key} error`}
                  testID={`error-${key}`}
                  buttonType={ButtonType.Secondary}
                  onPress={() => triggerError(key)}
                />
                <Text style={[styles.description, { marginTop: 4, marginBottom: 0 }]}>{description}</Text>
              </View>
            )
          })}
        </View>

        {/* Error as Native Alert Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('Developer.ErrorAsNativeAlert')}</Text>
          <Text style={styles.description}>{t('Developer.ErrorAsNativeAlertDescription')}</Text>

          {sampleErrors.slice(0, 4).map(({ key }) => (
            <View key={`alert-${key}`} style={styles.buttonRow}>
              <Button
                title={`${key} (Native Alert)`}
                accessibilityLabel={`Trigger ${key} as native alert`}
                testID={`error-alert-${key}`}
                buttonType={ButtonType.Secondary}
                onPress={() => triggerErrorAsAlert(key)}
              />
            </View>
          ))}
        </View>

        {/* Plain Alerts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('Developer.PlainAlerts')}</Text>
          <Text style={styles.description}>{t('Developer.PlainAlertsDescription')}</Text>

          {sampleAlerts.map(({ title, body }) => (
            <View key={title} style={styles.buttonRow}>
              <Button
                title={title}
                accessibilityLabel={`Trigger ${title} alert`}
                testID={`alert-${title}`}
                buttonType={ButtonType.Secondary}
                onPress={() => triggerAlert(title, body)}
              />
            </View>
          ))}
        </View>

        {/* Dismiss Error Modal */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('Developer.DismissErrorModal')}</Text>
          <Text style={styles.description}>{t('Developer.DismissErrorModalDescription')}</Text>

          <View style={styles.buttonRow}>
            <Button
              title={t('Developer.DismissCurrentError')}
              accessibilityLabel={t('Developer.DismissCurrentError')}
              testID="dismiss-error"
              buttonType={ButtonType.Primary}
              onPress={dismiss}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  )
}

export default ErrorAlertTest
