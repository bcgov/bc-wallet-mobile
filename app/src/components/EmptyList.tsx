import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import EmptyWallet from '../assets/img/emptyWallet.svg'
import { useTheme, testIdWithKey, Button, ButtonType, useStore } from 'aries-bifold'
import { BCState, BCDispatchAction } from '../store'
export interface EmptyListProps {
    message?: string
}

const EmptyList: React.FC<EmptyListProps> = ({ message }) => {
    const { t } = useTranslation()
    const { ListItems, } = useTheme()
    const [store, dispatch] = useStore<BCState>()

    const addCredentialPress = useCallback(() => {
        dispatch({
            type: BCDispatchAction.ADD_CREDENTIAL_PRESSED,
            payload: [true],
        })
    }, [])

    return (
        <View style={{ marginTop: 100, height: '100%' }}>
            <EmptyWallet height={200} />
            <Text style={[ListItems.emptyList, { textAlign: 'center' }]} testID={testIdWithKey('NoneYet')}>
                {message || t('Global.NoneYet!')}
            </Text>
            <View style={{ margin: 25 }}>
                <Button title={t('Credentials.AddFirstCredential')} buttonType={ButtonType.Primary} onPress={addCredentialPress} disabled={store.addCredential.addCredentialPressed} ></Button>
            </View>
        </View>
    )
}

export default EmptyList
