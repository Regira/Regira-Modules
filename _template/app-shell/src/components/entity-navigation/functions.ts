import { computed, getCurrentInstance } from "vue"
import { type IConfig, importDashboard, importNavbar, buildNavigationTree } from "@regira/modules/vue/entities"
import { useConfig } from "@/app-config"

// reads config.json → navigation + the collected $configs, builds the dashboard/navbar trees
export function useNavigation() {
    const app = getCurrentInstance()!
    const {
        navigation: { groups, dashboard, navbar, search },
    } = useConfig()

    const configs = Object.values(app.appContext.config.globalProperties.$configs) as Array<IConfig>
    const hasAccess = (_config: IConfig) => true // gate by permissions here if needed

    const dashboardTree = computed(() => buildNavigationTree(importDashboard({ groups, entities: dashboard, configs, hasAccess })))
    const navbarTree = computed(() => buildNavigationTree(importNavbar({ groups, entities: navbar, configs, hasAccess })))
    const searchItemConfig = computed(() => configs.find((c) => c.key === search))

    return { dashboardTree, navbarTree, searchItemConfig }
}
