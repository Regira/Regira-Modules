import { createApp } from "vue"
import { createPinia } from "pinia"
import type { RouteRecordRaw } from "vue-router"
import { initAxios } from "regira/vue/http"
import { plugin as servicesPlugin, type IServiceProvider } from "regira/vue/ioc"
import { plugin as appPlugin, AppStatus, whenAppReady } from "regira/vue/app"
import { plugin as langPlugin } from "regira/vue/lang"
import { useLang } from "regira/vue/lang" // used for document.title + (auth) setLangCode
import { iconPlugin, screenPlugin, loadingPlugin, feedbackPlugin } from "regira/vue/ui"
import { focus, grow, clickOutside } from "regira/vue/directives"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-icons/font/bootstrap-icons.css"
import "regira/style.css"
import "@/assets/theme.scss" // the app theme — MUST come after bootstrap + regira styles so its overrides win
import { plugin as authPlugin, LocalStorageTokenManager } from "regira/vue/auth" // @auth:only
import { plugin as userPlugin } from "@/infrastructure/user-plugin" // @auth:only
import { preloaderPlugin, defaultPoolCache, PoolCache } from "regira/vue/entities"
import { plugin as debugPlugin } from "regira/vue/debug"
import dateExtensions from "regira/extensions/date-extensions"
import entityPlugins from "@/entities"
import { routerFactory } from "@/router"
import appConfig, { createConfig } from "@/app-config"
import App from "@/App.vue"

const loadingImg = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" // 1×1 — swap for your spinner

dateExtensions.use() // serialize Dates to JSON without a timezone shift

fetch(`${appConfig.baseUrl}/config.json`)
    .then((r) => r.json())
    .then(async (raw) => {
        const config = createConfig(raw)
        const axios = initAxios({ api: config.api, includeCredentials: config.includeCredentials })
        const translations = await fetch(`${appConfig.baseUrl}/data/translations.json`).then((r) => r.json())

        const app = createApp(App)
        app.use(createPinia())
        app.use(appPlugin, { culture: config.culture })
        app.use(servicesPlugin, {
            configure: (sp: IServiceProvider) => sp.add("axios", () => axios).add(PoolCache.name, () => defaultPoolCache),
        })

        app.use(iconPlugin, { source: "bs" })
        app.use(screenPlugin)
        app.use(loadingPlugin, { img: loadingImg })
        app.use(feedbackPlugin, { autoHideDelay: 2500 })
        app.use(langPlugin, { defaultLang: "en", messages: translations })

        document.title = useLang().translateMessage(config.title) || document.title // browser-tab title from config.title (culture-keyed); re-set on culture change if you localize it

        app.use(focus)
        app.use(grow)
        app.use(clickOutside)

        const entityRoutes: Array<RouteRecordRaw> = []
        app.use(entityPlugins, { routes: entityRoutes })
        app.use(routerFactory([...entityRoutes]))
        app.use(preloaderPlugin)
        app.use(debugPlugin, { isDebug: config.isDebug })

        // @auth:block-start
        const { setLangCode } = useLang()
        app.use(authPlugin, {
            axios,
            tokenManager: new LocalStorageTokenManager(),
            clientApp: config.clientApp,
            loginUrl: config.loginUrl,
            onAuthenticationChange: (auth) => {
                app.config.globalProperties.$setAppStatus(auth.isAuthenticated ? AppStatus.Ready : AppStatus.Init)
                if (auth.isAuthenticated && auth.culture) setLangCode(auth.culture.split("-")[0])
            },
        })
        app.use(userPlugin)
        // @auth:block-end

        app.config.globalProperties.$setAppStatus(AppStatus.Mounting)
        app.mount("#app")
        app.config.globalProperties.$setAppStatus(AppStatus.Ready) // @noauth:only — no auth → advance to Ready manually
        await whenAppReady()
    })
