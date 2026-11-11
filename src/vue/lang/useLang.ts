import type { Ref } from "vue"
import type { ITranslationMessages, ITranslationMessage } from "../../core/lang/translate"
import type { IFormatInput } from "../../core/lang/formatText"
import { createLangState } from "../../core/lang/lang"
import { vueBox } from "../box"

// the app-wide language state: one, shared by every useLang() and the plugin
const state = createLangState({ box: vueBox })

export function useLang(): {
    langCode: Ref<string>
    fallbackLangCode: Ref<string>
    messages: Ref<ITranslationMessages>
    translate: (key: string, formatArgs?: IFormatInput) => string
    translateMessage: (message: ITranslationMessage, formatArgs?: IFormatInput) => string
    setLangCode(newValue: string): void
    replaceMessages: (newValue: ITranslationMessages) => ITranslationMessages
    loadMessages: (values: ITranslationMessages) => ITranslationMessages
} {
    // the boxes are refs; a fresh object per call, as before, over the one state
    return { ...state } as unknown as ReturnType<typeof useLang>
}

export default useLang
