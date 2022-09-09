import type {
    StructureTranslation,
    Translations,
} from '../../OCA-package/oca.js-form-core/types';

const getLanguage = (
    translation: Translations<StructureTranslation>,
    language: string = 'en'
) => {
    const availableLanguages = Object.keys(translation);
    let defaultLanguage = availableLanguages[0];
    if (language) {
        if (availableLanguages.includes(language)) {
            defaultLanguage = language;
        } else if (availableLanguages.find((lang) => lang.startsWith(language))) {
            // @ts-ignore
            defaultLanguage = availableLanguages.find((lang) =>
                lang.startsWith(language)
            );
        }
    }
    return defaultLanguage;
};

export default getLanguage;
