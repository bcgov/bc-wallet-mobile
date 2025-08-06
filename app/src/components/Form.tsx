/*
This component displays a form with the fields defined in the props passed to it
you can pass a validation function which will be called with the Continue button
*/
import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { View, StyleSheet } from 'react-native'
import { Button, ButtonType, LimitedTextInput, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'

interface FormField {
    name: string
    label: string
    type: 'text' | 'email' | 'password'
    showCharacterCount?: boolean
    validation?: {
        required?: string
        pattern?: {
            value: RegExp
            message: string
        }
        minLength?: {
            value: number
            message?: string
        }
        maxLength?: {
            value: number
            message?: string
        }
    }
}

interface FormProps {
    fields: FormField[]
    onSubmit: (data: Record<string, any>) => void
    submitButtonTitle?: string
    defaultValues?: Record<string, any>
}

const Form: React.FC<FormProps> = ({ 
    fields, 
    onSubmit, 
    submitButtonTitle,
    defaultValues = {}
}) => {
    const { t } = useTranslation()
    const { control, handleSubmit, formState: { errors, isValid } } = useForm({
        defaultValues,
        mode: 'onChange'
    })
    const { ColorPalette, Spacing } = useTheme()

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            padding: Spacing.md,
        },
        fieldContainer: {
            marginBottom: Spacing.md,
        },
        errorText: {
            color: ColorPalette.semantic.error,
            marginTop: Spacing.xs,
        },
        submitButton: {
            marginTop: Spacing.lg,
        },
    })

    return (
        <View style={styles.container}>
            {fields.map((field) => (
                <View key={field.name} style={styles.fieldContainer}>
                    <Controller
                        control={control}
                        name={field.name}
                        rules={field.validation}
                        render={({ field: { onChange, onBlur, value } }) => {                            
                            return (
                                <LimitedTextInput
                                    label={field.label}
                                    limit={field.validation?.maxLength?.value || 500}
                                    showLimitCounter={field.showCharacterCount || false}
                                    handleChangeText={onChange}
                                    secureTextEntry={field.type === 'password'}
                                    keyboardType={field.type === 'email' ? 'email-address' : 'default'}
                                    autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
                                    autoCorrect={field.type !== 'email'}
                                    value={value}
                                    onBlur={onBlur}
                                />
                            )
                        }}
                    />
                    {errors[field.name] && (
                        <ThemedText style={styles.errorText}>
                            {errors[field.name]?.message as string}
                        </ThemedText>
                    )}
                </View>
            ))}
            <View style={styles.submitButton}>
                <Button
                    title={submitButtonTitle || t('Global.Continue')}
                    buttonType={ButtonType.Primary}
                    onPress={handleSubmit(onSubmit)}
                    disabled={!isValid}
                />
            </View>
        </View>
    )
}

export default Form
export type { FormField, FormProps }
export { Form }
