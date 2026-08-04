import { ref } from "vue"
import { translate, translateMessage, type ITranslationMessages, type ITranslationMessage } from "./translate"
import type { IFormatInput } from "./formatText"

const langCode = ref<string>("")
const fallbackLangCode = ref<string>("")
const messages = ref<ITranslationMessages>({})

export function useLang() {
    return {
        langCode,
        fallbackLangCode,
        messages,

        translate: (key: string, formatArgs?: IFormatInput) =>
            translate(key, messages.value, langCode.value, formatArgs) || translate(key, messages.value, fallbackLangCode.value, formatArgs),
        translateMessage: (message: ITranslationMessage, formatArgs?: IFormatInput) =>
            translateMessage(message, langCode.value, formatArgs) || translateMessage(message, fallbackLangCode.value, formatArgs),
        setLangCode(newValue: string) {
            if (newValue) {
                langCode.value = newValue
            }
        },
        replaceMessages: (newValue: ITranslationMessages) => (messages.value = newValue),
        loadMessages: (values: ITranslationMessages) => (messages.value = { ...messages.value, ...values }),
    }
}

export default useLang
