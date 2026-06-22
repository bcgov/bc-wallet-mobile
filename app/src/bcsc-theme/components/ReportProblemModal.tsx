import { PressableOpacity } from '@/components/PressableOpacity'
import { BC_LOGIN_PRIVACY_URL, hitSlop } from '@/constants'
import { reportProblem } from '@/utils/logger'
import { BifoldError, Button, ButtonType, CheckBoxRow, Link, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import Clipboard from '@react-native-clipboard/clipboard'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import Icon from 'react-native-vector-icons/MaterialIcons'

const DESCRIPTION_MAX_LENGTH = 500
// A user-initiated report has no underlying error code; 0 marks it as user-originated in the report payload.
const USER_REPORT_ERROR_CODE = 0
// How long the "Copied" confirmation stays visible after copying the reference code.
const COPY_FEEDBACK_DURATION_MS = 2000

export interface ReportProblemModalProps {
  visible: boolean
  onClose: () => void
}

/**
 * A fully custom (React Native `Modal`) "Report a problem" flow.
 *
 * On submit it hands the user's description to the shared `reportProblem()` pipeline (see PR #4076),
 * which sends the report to remote logging (Loki) and returns a short, human-readable reference code.
 * The user can quote that code to support so the team can look the report up. Generating and sharing
 * the code (the "receipt") is owned by that shared pipeline rather than implemented here.
 *
 * The modal is self-contained and rendered from the floating help menu, so it works in every stack
 * without registering a per-stack screen.
 *
 * NOTE: The design spec for this flow is not finalised — the layout here is intentionally simple and
 * expected to be restyled once design lands. The collection-notice copy is placeholder text describing
 * the one-off report (no remote logging is enabled) and should be reviewed with design/privacy before
 * release.
 */
export const ReportProblemModal = ({ visible, onClose }: ReportProblemModalProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  // Inset works inside this RN Modal because the app's root SafeAreaProvider context crosses the
  // modal boundary; applied as scroll padding so the action button clears the home indicator.
  const insets = useSafeAreaInsets()

  const [description, setDescription] = useState('')
  const [consented, setConsented] = useState(false)
  const [referenceCode, setReferenceCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const submitted = referenceCode !== null

  // Clear any pending "Copied" reset timer when the modal unmounts.
  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current)
      }
    }
  }, [])

  const handleClose = useCallback(() => {
    // Reset so the modal opens fresh next time.
    setDescription('')
    setConsented(false)
    setReferenceCode(null)
    setCopied(false)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    // Carry the user's description on a BifoldError and report it through the shared pipeline, which
    // sends it to remote logging and returns the reference code to surface to the user.
    const reportError = new BifoldError(t('BCSC.ReportProblem.Title'), description.trim(), '', USER_REPORT_ERROR_CODE)
    setReferenceCode(reportProblem(reportError))
  }, [t, description])

  const handleCopy = useCallback(() => {
    if (!referenceCode) {
      return
    }
    Clipboard.setString(referenceCode)
    setCopied(true)
    if (copyResetTimeout.current) {
      clearTimeout(copyResetTimeout.current)
    }
    copyResetTimeout.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS)
  }, [referenceCode])

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
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    copyButtonText: {
      color: ColorPalette.brand.primary,
    },
  })

  const renderForm = () => (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: Spacing.md + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
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

      {/* Lightweight collection notice for the one-off report: the modal sends the user's description
          plus basic app/device info to support and no longer enables remote logging. Placeholder copy
          pending design/privacy review. The Privacy Policy link is inline so the notice reads as one
          sentence rather than floating on its own row. */}
      <ThemedText style={styles.noticeText}>
        {t('BCSC.ReportProblem.CollectionNotice')}{' '}
        <Link
          linkText={t('BCSC.ReportProblem.PrivacyPolicyLink')}
          onPress={() => Linking.openURL(BC_LOGIN_PRIVACY_URL)}
        />
      </ThemedText>

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
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Spacing.md + insets.bottom }]}>
      <View style={styles.successContainer}>
        <Icon name="check-circle" size={64} color={ColorPalette.brand.primary} />
        <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
          {t('BCSC.ReportProblem.SuccessTitle')}
        </ThemedText>
        <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.ReportProblem.SuccessBody')}</ThemedText>
        <ThemedText variant="bold">{t('Error.ReferenceCode')}</ThemedText>
        <View style={styles.codeBox}>
          <ThemedText
            variant="headingTwo"
            style={styles.code}
            accessibilityLabel={`${t('Error.ReferenceCode')}: ${referenceCode}`}
            testID={testIdWithKey('ReportProblemReferenceCode')}
          >
            {referenceCode}
          </ThemedText>
        </View>
        <PressableOpacity
          onPress={handleCopy}
          style={styles.copyButton}
          accessibilityRole="button"
          accessibilityLabel={copied ? t('Error.CodeCopied') : t('Error.CopyCode')}
          testID={testIdWithKey('ReportProblemCopyCode')}
        >
          <CommunityIcon
            name={copied ? 'check' : 'content-copy'}
            size={18}
            color={copied ? ColorPalette.semantic.success : ColorPalette.brand.primary}
          />
          <ThemedText variant="bold" style={styles.copyButtonText}>
            {copied ? t('Error.CodeCopied') : t('Error.CopyCode')}
          </ThemedText>
        </PressableOpacity>
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
          <View style={styles.sheet}>
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default ReportProblemModal
