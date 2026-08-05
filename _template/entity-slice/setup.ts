import type { AxiosInstance } from "axios"
import type { App } from "vue"
import type { RouteRecordRaw } from "vue-router"
import type { IServiceProvider } from "@regira/modules/vue/ioc"
import type { IIconProvider } from "@regira/modules/vue/ui/icons"
import { DetailsSummary } from "@regira/modules/vue/entities"
import config from "./config/config"
import { Entity } from "./data/Entity"
import Overview from "./overview/Overview.vue"
import Details from "./details/Details.vue"
import Form from "./details/Form.vue"
import EntityService from "./data/EntityService"

export function createRoutes(): Array<RouteRecordRaw> {
    const key = config.key
    return [
        { path: `/${config.routePrefix}`, name: `${key}Overview`, component: Overview },
        {
            path: `/${config.routePrefix}/:id`,
            name: `${key}Details`,
            component: Details,
            children: [
                { path: "details", name: `${key}Fiche`, component: DetailsSummary },
                { path: "edit", name: `${key}Form`, component: Form },
            ],
            redirect: () => ({ name: `${key}Form` }),
        },
    ] as Array<RouteRecordRaw>
}

export function addServices(serviceProvider: IServiceProvider) {
    serviceProvider.add(Entity.name, (sp) => new EntityService(sp.get<AxiosInstance>("axios")!, config))
}
export function addIcons(icons: IIconProvider) {
    icons.add(config.key, config.icon!)
}

export default {
    install(app: App<Element>, { routes }: { routes: Array<RouteRecordRaw> }) {
        routes.push(...createRoutes())
        addServices(app.config.globalProperties.$services)
        addIcons(app.config.globalProperties.$icons)
        app.config.globalProperties.$configs[Entity.name] = config
    },
}
