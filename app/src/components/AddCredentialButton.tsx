import React, {useCallback} from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, testIdWithKey, useStore } from 'aries-bifold'
import { BCState, BCDispatchAction } from '../store'

const AddCredentialButton: React.FC = () => {
    const { t } = useTranslation()
    const { ColorPallet } = useTheme()
    const [, dispatch] = useStore<BCState>()

    const activateSlider = useCallback(() => {
        dispatch({
            type: BCDispatchAction.ADD_CREDENTIAL_PRESSED,
            payload: [true],
        })
    }, [])

    const styles = StyleSheet.create({
        button: {
            paddingHorizontal: 16,
        },
    })
    return (
        <TouchableOpacity
            accessible={true}
            accessibilityLabel={t('Credentials.AddCredential')}
            testID={testIdWithKey('AddCredential')}
            style={styles.button}
            onPress={activateSlider}
        >
            <Icon name="plus-circle-outline" size={24} color={ColorPallet.grayscale.white}></Icon>
        </TouchableOpacity>
    )
}

export default AddCredentialButton
