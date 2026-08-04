import { globalOptions } from "../../ioc"
import { PAGING_DEFAULTS } from "./defaults"
import type { PagingComponent } from "./paging"
import Paging from "./Paging.vue"
import type { App } from "vue"

type Options = {
    defaultPageSize?: number
    /** the component registered app-wide as `Paging` when registerComponentsGlobally is on (compile-checked) */
    Paging?: PagingComponent
}

export default {
    install(app: App<Element>, { defaultPageSize = 10, Paging: PagingOverride }: Options = {}) {
        PAGING_DEFAULTS.PAGESIZE = defaultPageSize

        if (globalOptions.registerComponentsGlobally) {
            app.component("Paging", PagingOverride ?? (Paging as unknown as PagingComponent))
        }
    },
}
