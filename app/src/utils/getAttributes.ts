import {Attribute} from "aries-bifold/App/types/record";
import {Structure} from "../../OCA-package/oca.js-form-core/entities/Structure";

const getAttributes = (
    fields: Attribute[],
    language: string,
    structure?: Structure
) => {
    if (structure) {
        fields.map((field, index) => {
            structure.controls.map((control) => {
                if(control?.name === field.name){
                    fields[index].name = control.translations[language].label ?? null
                }
            })
        })
    }
    return fields
};

export default getAttributes;
