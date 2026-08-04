import type { App } from "vue"
import { globalOptions } from "../../ioc"
import bsIcons from "./bootstrap-icons"
import faIcons from "./fontawesome-icons"
import { iconMap, load, clear, type IconButtonComponent, type IconComponent, type IconsConfig } from "./icons"
import Icon from "./Icon.vue"
import IconButton from "./IconButton.vue"

type Options = {
    icons?: Record<string, string>
    clearFirst?: boolean
    source?: "bs" | "fa"
    /** the components registered app-wide when registerComponentsGlobally is on (compile-checked); library-internal
     * call sites keep the library Icon — swap glyphs there via `icons`/`source`, or restyle via the `rg-icon` hook */
    Icon?: IconComponent
    IconButton?: IconButtonComponent
}
export type IIconProvider = {
    add: (key: string, icon: string) => void
    source: "bs" | "fa"
    map: Map<string, string>
}

export default {
    install(app: App<Element>, { icons = {}, clearFirst = false, source = "bs", Icon: IconOverride, IconButton: IconButtonOverride }: Options = {}) {
        load(source == "bs" ? bsIcons : faIcons)

        app.provide<IconsConfig>("icons.config", { source, icons: iconMap })

        if (clearFirst) {
            clear()
        }
        if (icons != null) {
            load(icons)
        }

        app.config.globalProperties.$icons = {
            add: (key: string, icon: string) => load({ [key]: icon }),
            source,
            map: iconMap,
        } as IIconProvider

        if (globalOptions.registerComponentsGlobally) {
            // Icon.vue resolves Bs/Fa from the injected config, so it honors `source`.
            app.component("Icon", IconOverride ?? (Icon as unknown as IconComponent))
            app.component("IconButton", IconButtonOverride ?? (IconButton as unknown as IconButtonComponent))
        }
    },
}
