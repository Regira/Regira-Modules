export { useLang } from "./useLang"
export { plugin } from "./plugin"
export { translate, translateMessage, type ITranslationMessages, type ITranslationMessage } from "./translate"
export { formatText, type IFormatInput } from "./formatText"
export { default as LangSelector } from "./LangSelector.vue"
export { type LangSelectorProps, type LangSelectorEmits } from "./langSelector"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $t: (key: string, formatArgs?: import("./formatText").IFormatInput) => string
        $tm: (message: import("./translate").ITranslationMessage, formatArgs?: import("./formatText").IFormatInput) => string
    }
}
