import type { App } from "vue"
import type { RouteRecordRaw } from "vue-router"

// register each entity slice's plugin here as you scaffold them (node scaffold.mjs <Entity>):
//   import { plugin as productPlugin } from "./products"
//   export const plugins = [productPlugin]
export const plugins: any[] = []

export default {
    install(app: App<Element>, { routes }: { routes: Array<RouteRecordRaw> }) {
        plugins.forEach((plugin) => app.use(plugin as any, { routes }))
    },
}
