import { computed, getCurrentInstance } from "vue"
import { useRouter } from "vue-router" // @auth:only
import { type IConfig, importDashboard, importNavbar, buildNavigationTree } from "@regira/modules/vue/entities"
import { routeAllows, useAuthStore } from "@regira/modules/vue/auth" // @auth:only
import { useConfig } from "@/app-config"

// reads config.json → navigation + the collected $configs, builds the dashboard/navbar trees
export function useNavigation() {
    const app = getCurrentInstance()!
    const {
        navigation: { groups, dashboard, navbar, search },
    } = useConfig()

    const configs = Object.values(app.appContext.config.globalProperties.$configs) as Array<IConfig>
    // @auth:block-start
    // an entry shows when the route guard would let this user open its overview: the meta.policy / meta.permissions a
    // slice's setup.ts puts on its routes. Recomputed on sign-in, since the policies read the auth store
    const router = useRouter()
    const authStore = useAuthStore()
    const hasAccess = (config: IConfig) => {
        const name = `${config.key}Overview`
        return !router.hasRoute(name) || routeAllows(router.resolve({ name }), authStore)
    }
    // @auth:block-end
    // gate entries by anything of your own here // @noauth:only
    const hasAccess = (_config: IConfig) => true // @noauth:only

    const dashboardTree = computed(() => buildNavigationTree(importDashboard({ groups, entities: dashboard, configs, hasAccess })))
    const navbarTree = computed(() => buildNavigationTree(importNavbar({ groups, entities: navbar, configs, hasAccess })))
    const searchItemConfig = computed(() => configs.find((c) => c.key === search))

    return { dashboardTree, navbarTree, searchItemConfig }
}
