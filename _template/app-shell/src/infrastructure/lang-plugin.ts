import { watch } from "vue"
import { useLang } from "@regira/modules/vue/lang"

// Remembers the chosen language: restores it on the next visit and saves every change. A signed-in account's
// culture, set in main.ts once the token is validated, still wins over it.
export const plugin = {
    install() {
        const { langCode, setLangCode } = useLang()
        try {
            const last = localStorage.getItem("lang")?.substring(0, 2)
            if (last && last !== langCode.value) setLangCode(last)
        } catch {
            // storage is blocked (a privacy setting): the default language stands
        }
        watch(langCode, (code) => {
            try {
                localStorage.setItem("lang", code)
            } catch {
                // nowhere to keep it: the choice lasts this visit
            }
        })
    },
}

export default plugin
