import {Attribute} from "aries-bifold/App/types/record";
import {Structure} from "../../OCA-package/oca.js-form-core/entities/Structure";

const getAttributes = (
    fields: Attribute[],
    language: string,
    structure?: Structure
) => {
    const translatedFields: Attribute[] = []
    if (structure) {
        fields.forEach((field, index) => {
            structure.controls.forEach((control) => {
                if(control?.name === field.name){
                    translatedFields[index] = {...fields[index], name: control.translations[language].label ?? fields[index].name}
                }
            })
        })
    }
    return translatedFields
};

export default getAttributes;
