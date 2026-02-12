import BCSCApiClient from '@/bcsc-theme/api/client'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError } from '@/errors'
import { ErrorCategory, ErrorRegistry, ErrorRegistryKey } from '@/errors/errorRegistry'
import { Button, ButtonType, ScreenWrapper, TOKENS, useServices, useTheme } from '@bifold/core'
import { AxiosError } from 'axios'
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
  const client = useBCSCApiClient()
  const { emitErrorModal, emitErrorAlert, emitAlert, dismiss } = useErrorAlert()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

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

  const serverErrorCodeAlertCallbacks = {
    // Should not render alert (InternetDisconnectedModal)
    no_internet: () => injectErrorCodeIntoAxiosResponse(client, 'no_internet'),
    unsecured_network: () => injectErrorCodeIntoAxiosResponse(client, 'unsecured_network'),
    server_timeout: () => injectErrorCodeIntoAxiosResponse(client, 'server_timeout'),
    server_error: () => injectErrorCodeIntoAxiosResponse(client, 'server_error'),
    ios_app_update_required: () =>
      injectErrorCodeIntoAxiosResponse(client, 'ios_app_update_required', client.endpoints.evidence),
    android_app_update_required: () =>
      injectErrorCodeIntoAxiosResponse(client, 'android_app_update_required', client.endpoints.evidence),
    // Must be verified and on the main stack to see this alert
    no_tokens_returned: () => {
      onBack() // close the modal first
      injectErrorCodeIntoAxiosResponse(client, 'no_tokens_returned', client.endpoints.token)
    },
    unexpected_server_error_500: () => injectErrorCodeIntoAxiosResponse(client, '', undefined, 500),
    unexpected_server_error_503: () => injectErrorCodeIntoAxiosResponse(client, '', undefined, 503),
    login_server_error: () =>
      injectErrorCodeIntoAxiosResponse(
        client,
        'login_server_error',
        `${client.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`
      ),
    too_many_attempts: () => injectErrorCodeIntoAxiosResponse(client, 'too_many_attempts'),
    user_input_expired_verify_request: () =>
      injectErrorCodeIntoAxiosResponse(client, 'user_input_expired_verify_request', client.endpoints.token),
    verify_not_complete: () => injectErrorCodeIntoAxiosResponse(client, 'verify_not_complete', client.endpoints.token),
    login_parse_uri: () =>
      injectErrorCodeIntoAxiosResponse(
        client,
        'login_parse_uri',
        `${client.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`
      ),
    invalid_pairing_code: () =>
      injectErrorCodeIntoAxiosResponse(
        client,
        'invalid_pairing_code',
        `${client.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`
      ),
    login_remembered_device_invalid_pairing_code: () =>
      injectErrorCodeIntoAxiosResponse(
        client,
        'login_remembered_device_invalid_pairing_code',
        `${client.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`
      ),
    login_same_device_invalid_pairing_code: () =>
      injectErrorCodeIntoAxiosResponse(
        client,
        'login_same_device_invalid_pairing_code',
        `${client.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`
      ),
    already_verified: () => injectErrorCodeIntoAxiosResponse(client, 'already_verified', client.endpoints.token),
    client_login_rejected_400: () =>
      injectErrorCodeIntoAxiosResponse(client, 'login_rejected_400', `${client.endpoints.clientMetadata}`),
    client_login_rejected_401: () =>
      injectErrorCodeIntoAxiosResponse(client, 'login_rejected_401', `${client.endpoints.clientMetadata}`),
    client_login_rejected_403: () =>
      injectErrorCodeIntoAxiosResponse(client, 'login_rejected_403', `${client.endpoints.clientMetadata}`),
    device_login_rejected_400: () =>
      injectErrorCodeIntoAxiosResponse(client, 'login_rejected_400', `${client.endpoints.deviceAuthorization}`),
    device_login_rejected_401: () =>
      injectErrorCodeIntoAxiosResponse(client, 'login_rejected_401', `${client.endpoints.deviceAuthorization}`),
    device_login_rejected_403: () =>
      injectErrorCodeIntoAxiosResponse(client, 'login_rejected_403', `${client.endpoints.deviceAuthorization}`),
  }

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
    emitErrorModal(key, {
      error: new Error(`Test error triggered for: ${key}`),
      context: { source: 'ErrorAlertTest', timestamp: new Date().toISOString() },
    })
  }

  const triggerErrorAsAlert = (key: ErrorRegistryKey) => {
    const definition = ErrorRegistry[key]
    const error = AppError.fromErrorDefinition(definition)
    emitErrorAlert(error, {
      actions: [
        { text: t('Global.Cancel'), style: 'cancel' },
        { text: t('Global.Okay'), style: 'default' },
      ],
    })
  }

  const injectErrorCodeIntoAxiosResponse = async (
    client: BCSCApiClient,
    errorCode: string,
    endpoint?: string,
    status?: number
  ) => {
    const id = client.client.interceptors.request.use((config) => {
      client.client.interceptors.request.eject(id)
      throw new AxiosError('Injected error message', errorCode, config, undefined, {
        data: {},
        status: status ?? 0,
        statusText: 'Error',
        headers: {},
        config,
      })
    })

    try {
      await client.get(endpoint ?? '/any-endpoint')
    } catch (error) {
      logger.debug(`Injected error code ${errorCode} into Axios response`)
    }
  }

  const triggerAlert = (title: string, body: string) => {
    emitAlert(title, body, { actions: [{ text: t('Global.Okay'), style: 'default' }] })
  }

  return (
    <ScreenWrapper scrollable={false} edges={['top']}>
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
                  title={`${key} (${definition.statusCode})`}
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

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{'Server error codes'}</Text>
          <Text style={styles.description}>{'Known error codes from IAS'}</Text>
          {Object.keys(serverErrorCodeAlertCallbacks).map((errorCode) => (
            <View key={errorCode} style={styles.buttonRow}>
              <Button
                title={errorCode}
                accessibilityLabel={`Trigger API error code ${errorCode}`}
                testID={`api-error-${errorCode}`}
                buttonType={ButtonType.Secondary}
                onPress={() => serverErrorCodeAlertCallbacks[errorCode as keyof typeof serverErrorCodeAlertCallbacks]()}
              />
            </View>
          ))}
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
