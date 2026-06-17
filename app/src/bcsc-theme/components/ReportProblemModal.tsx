import { PressableOpacity } from '@/components/PressableOpacity'
import { BC_LOGIN_PRIVACY_URL, hitSlop } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  CheckBoxRow,
  Link,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { RemoteLogger, RemoteLoggerEventTypes } from '@bifold/remote-logs'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

const DESCRIPTION_MAX_LENGTH = 500

export interface ReportProblemModalProps {
  visible: boolean
  onClose: () => void
}

/**
 * A fully custom (React Native `Modal`) "Report a problem" flow.
 *
 * On submit it enables the app's existing remote troubleshooting (remote logging) and surfaces the
 * `RemoteLogger` session id as a reference code, so a user can quote it to support and the support
 * team can look up the corresponding logs (see issues #3903 and #3952).
 *
 * The modal is self-contained and rendered from the floating help menu, so it works in every stack
 * without registering a per-stack screen.
 *
 * NOTE: The design spec for this flow is not finalised — the layout here is intentionally simple and
 * expected to be restyled once design lands. The privacy / collection-notice copy is reused from the
 * existing remote-troubleshooting feature so the data-collection framing stays consistent.
 */
export const ReportProblemModal = ({ visible, onClose }: ReportProblemModalProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER]) as [RemoteLogger]

  const [description, setDescription] = useState('')
  const [consented, setConsented] = useState(false)
  const [referenceCode, setReferenceCode] = useState<number | null>(null)

  const submitted = referenceCode !== null

  const handleClose = useCallback(() => {
    // Reset so the modal opens fresh next time.
    setDescription('')
    setConsented(false)
    setReferenceCode(null)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    if (!logger) {
      return
    }

    // Enable remote troubleshooting so support can retrieve diagnostics for this session, mirroring
    // the Developer screen's flow (DeviceEventEmitter + persisted remote-debugging state).
    DeviceEventEmitter.emit(RemoteLoggerEventTypes.ENABLE_REMOTE_LOGGING, true)
    const sessionId = logger.sessionId
    dispatch({
      type: BCDispatchAction.REMOTE_DEBUGGING_STATUS_UPDATE,
      payload: [{ enabledAt: new Date(), sessionId }],
    })

    // Record the user's description under this session so support can read it alongside the logs.
    logger.info('[ReportProblem] Problem reported by user', {
      referenceCode: sessionId,
      description: description.trim(),
    })

    setReferenceCode(sessionId)
  }, [logger, dispatch, description])

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
    sheet: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    content: {
      padding: Spacing.md,
      gap: Spacing.md,
    },
    input: {
      ...TextTheme.normal,
      minHeight: 96,
      borderWidth: 1,
      borderColor: ColorPalette.grayscale.mediumGrey,
      borderRadius: 8,
      padding: Spacing.sm,
      textAlignVertical: 'top',
    },
    noticeText: {
      color: TextTheme.normal.color,
    },
    successContainer: {
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    codeBox: {
      borderWidth: 1,
      borderColor: ColorPalette.brand.primary,
      borderRadius: 8,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
    },
    code: {
      letterSpacing: 4,
      textAlign: 'center',
    },
  })

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ThemedText>{t('BCSC.ReportProblem.Intro')}</ThemedText>

      <View>
        <ThemedText variant="bold" style={{ marginBottom: Spacing.sm }}>
          {t('BCSC.ReportProblem.DescriptionLabel')}
        </ThemedText>
        <TextInput
          style={styles.input}
          multiline
          maxLength={DESCRIPTION_MAX_LENGTH}
          value={description}
          onChangeText={setDescription}
          placeholder={t('BCSC.ReportProblem.DescriptionPlaceholder')}
          placeholderTextColor={ColorPalette.grayscale.mediumGrey}
          accessibilityLabel={t('BCSC.ReportProblem.DescriptionLabel')}
          testID={testIdWithKey('ReportProblemDescription')}
        />
      </View>

      {/* Factual collection notice reused from the remote-troubleshooting feature so the
          data-collection framing stays consistent across the app. */}
      <ThemedText style={styles.noticeText}>
        {t('RemoteLogging.CollectionNoticePart1')}
        <ThemedText variant="bold">{t('RemoteLogging.CollectionNoticeBold')}</ThemedText>
        {t('RemoteLogging.CollectionNoticePart2')}
      </ThemedText>
      <Link linkText={t('RemoteLogging.CollectionNoticeLink')} onPress={() => Linking.openURL(BC_LOGIN_PRIVACY_URL)} />

      <CheckBoxRow
        title={t('BCSC.ReportProblem.ConsentCheckbox')}
        accessibilityLabel={t('BCSC.ReportProblem.ConsentCheckbox')}
        testID={testIdWithKey('ReportProblemConsent')}
        checked={consented}
        onPress={() => setConsented((prev) => !prev)}
      />

      <Button
        title={t('BCSC.ReportProblem.Submit')}
        accessibilityLabel={t('BCSC.ReportProblem.Submit')}
        testID={testIdWithKey('ReportProblemSubmit')}
        buttonType={ButtonType.Primary}
        disabled={!consented}
        onPress={handleSubmit}
      />
    </ScrollView>
  )

  const renderSuccess = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.successContainer}>
        <Icon name="check-circle" size={64} color={ColorPalette.brand.primary} />
        <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
          {t('BCSC.ReportProblem.SuccessTitle')}
        </ThemedText>
        <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.ReportProblem.SuccessBody')}</ThemedText>
        <ThemedText variant="bold">{t('BCSC.ReportProblem.ReferenceCode')}</ThemedText>
        <View style={styles.codeBox}>
          <ThemedText
            variant="headingTwo"
            style={styles.code}
            accessibilityLabel={referenceCode?.toString()}
            testID={testIdWithKey('ReportProblemReferenceCode')}
          >
            {referenceCode?.toString()}
          </ThemedText>
        </View>
      </View>
      <Button
        title={t('BCSC.ReportProblem.Done')}
        accessibilityLabel={t('BCSC.ReportProblem.Done')}
        testID={testIdWithKey('ReportProblemDone')}
        buttonType={ButtonType.Primary}
        onPress={handleClose}
      />
    </ScrollView>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      testID={testIdWithKey('ReportProblemModal')}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.root}>
          {/* Backdrop tap dismisses the modal. */}
          <PressableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t('Global.Close')}
          />
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.header}>
              <ThemedText variant="headingThree">{t('BCSC.ReportProblem.Title')}</ThemedText>
              <PressableOpacity
                onPress={handleClose}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={t('Global.Close')}
                testID={testIdWithKey('ReportProblemClose')}
              >
                <Icon name="close" size={24} color={ColorPalette.brand.headerText} />
              </PressableOpacity>
            </View>
            {submitted ? renderSuccess() : renderForm()}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default ReportProblemModal
