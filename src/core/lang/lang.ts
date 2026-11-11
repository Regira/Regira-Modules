import type { Box, BoxFactory } from "../box"
import { translate, translateMessage, type ITranslationMessages, type ITranslationMessage } from "./translate"
import type { IFormatInput } from "./formatText"

export interface LangState {
    langCode: Box<string>
    fallbackLangCode: Box<string>
    messages: Box<ITranslationMessages>

    /** the key's message in the active language, else in the fallback language */
    translate(key: string, formatArgs?: IFormatInput): string
    translateMessage(message: ITranslationMessage, formatArgs?: IFormatInput): string
    /** an empty code leaves the language as it is */
    setLangCode(newValue: string): void
    replaceMessages(newValue: ITranslationMessages): ITranslationMessages
    loadMessages(values: ITranslationMessages): ITranslationMessages
}

/** the active language and its messages; a framework layer keeps one app-wide (the core's rule 5) */
export function createLangState({ box }: { box: BoxFactory }): LangState {
    const langCode = box<string>("")
    const fallbackLangCode = box<string>("")
    const messages = box<ITranslationMessages>({})

    return {
        langCode,
        fallbackLangCode,
        messages,

        translate: (key, formatArgs) =>
            translate(key, messages.value, langCode.value, formatArgs) || translate(key, messages.value, fallbackLangCode.value, formatArgs),
        translateMessage: (message, formatArgs) =>
            translateMessage(message, langCode.value, formatArgs) || translateMessage(message, fallbackLangCode.value, formatArgs),
        setLangCode(newValue) {
            if (newValue) {
                langCode.value = newValue
            }
        },
        replaceMessages: (newValue) => (messages.value = newValue),
        loadMessages: (values) => (messages.value = { ...messages.value, ...values }),
    }
}
