import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import {Attribute, Field} from "aries-bifold/App/types/record";
import {useTheme} from "aries-bifold";

import RecordField from 'aries-bifold/App/components/record/RecordField'
import RecordFooter from 'aries-bifold/App/components/record/RecordFooter'
import RecordHeader from 'aries-bifold/App/components/record/RecordHeader'
import {RecordProps} from "aries-bifold/App/components/record/Record";
import getLanguage from "../../utils/getLanguage";
import getAttributes from "../../utils/getAttributes";
import {OcaJs} from "../../../OCA-package/oca.js-form-core";
import {i18n} from "aries-bifold/App/localization";
import {OCA} from "../../../OCA-package/oca/oca";



const Record: React.FC<RecordProps> = ({ header, footer, fields = [], hideFieldValues = false, field = null, oca = null }) => {
    const { t } = useTranslation()
    const [shown, setShown] = useState<boolean[]>([])
    const { ListItems, TextTheme } = useTheme()
    const [attributes , setAttributes] = useState<Field[]>([])
    const styles = StyleSheet.create({
        linkContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: 25,
            paddingVertical: 16,
        },
        link: {
            minHeight: TextTheme.normal.fontSize,
            paddingVertical: 2,
        },
    })

    useEffect(() => {
        const createStructure = async () => {
            const ocaJs = new OcaJs({});
            if (oca) {
                return await ocaJs.createStructure(oca as OCA);
            }
        }
        createStructure().then(ocaStructure => {
            if(ocaStructure){
                const lang = getLanguage(ocaStructure.translations, i18n.language)
                setAttributes(getAttributes((fields as Attribute[]), lang, ocaStructure))
            }
            else {
                setAttributes(fields)
            }
        })
    }, [])

    const resetShown = (): void => {
        setShown(fields.map(() => false))
    }

    useEffect(() => {
        resetShown()
    }, [])

    return (
        <FlatList
            data={attributes}
            keyExtractor={({ name }, index) => name || index.toString()}
            renderItem={({ item: attr, index }) =>
                field ? (
                    field(attr, index, attributes)
                ) : (
                    <RecordField
                        field={attr}
                        hideFieldValue={hideFieldValues}
                        onToggleViewPressed={() => {
                            const newShowState = [...shown]
                            newShowState[index] = !shown[index]
                            setShown(newShowState)
                        }}
                        shown={hideFieldValues ? !!shown[index] : true}
                        hideBottomBorder={index === fields.length - 1}
                    />
                )
            }
            ListHeaderComponent={
                header ? (
                    <RecordHeader>
                        {header()}
                        {hideFieldValues ? (
                            <View style={styles.linkContainer}>

                                <TouchableOpacity
                                    style={styles.link}
                                    activeOpacity={1}
                                    onPress={() => resetShown()}
                                    accessible={true}
                                    accessibilityLabel={t('Record.HideAll')}
                                >
                                    <Text style={ListItems.recordLink}>{t('Record.HideAll')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </RecordHeader>
                ) : null
            }
            ListFooterComponent={footer ? <RecordFooter>{footer()}</RecordFooter> : null}
        />
    )
}

export default Record
