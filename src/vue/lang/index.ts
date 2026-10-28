export { useLang } from "./useLang"
export { plugin } from "./plugin"
export { translate, translateMessage, type ITranslationMessages, type ITranslationMessage } from "../../core/lang/translate"
export { formatText, type IFormatInput, type FormatTextOptions } from "../../core/lang/formatText"
export { default as LangSelector } from "./LangSelector.vue"
export { type LangSelectorProps, type LangSelectorEmits } from "./langSelector"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $t: (key: string, formatArgs?: import("../../core/lang/formatText").IFormatInput) => string
        $tm: (
            message: import("../../core/lang/translate").ITranslationMessage,
            formatArgs?: import("../../core/lang/formatText").IFormatInput
        ) => string
    }
}
