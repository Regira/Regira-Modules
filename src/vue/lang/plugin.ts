import { ref, watchEffect, type App } from "vue"
import { type ITranslationMessage, type ITranslationMessages } from "./translate"
import type { IFormatInput } from "./formatText"
import { useLang } from "./useLang"

type IMessageLoader = () => Promise<ITranslationMessages>
type IOptions = {
    defaultLang?: string
    messages: ITranslationMessages | IMessageLoader
}
export const plugin = {
    install(app: App, options: IOptions) {
        // add useLang().properties to global properties, using a '$' prefix
        const messagesLoaded = ref(false)
        const { fallbackLangCode, translate, translateMessage, setLangCode, replaceMessages } = useLang()

        // set initial language
        setLangCode(options.defaultLang ?? "en")
        fallbackLangCode.value = options.defaultLang ?? "en"

        // set messages
        if (typeof options.messages == "function") {
            watchEffect(async () => {
                const values = await (options.messages as unknown as IMessageLoader)()
                replaceMessages(values)
                messagesLoaded.value = true
            })
        } else {
            replaceMessages(options.messages)
            messagesLoaded.value = true
        }

        app.config.globalProperties.$t = (key: string, formatArgs?: IFormatInput) => {
            return messagesLoaded.value ? translate(key, formatArgs) : ""
        }
        app.config.globalProperties.$tm = (message: ITranslationMessage, formatArgs?: IFormatInput) => {
            return translateMessage(message, formatArgs)
        }
    },
}
