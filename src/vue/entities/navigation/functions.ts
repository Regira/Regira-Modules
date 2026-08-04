import { TreeList } from "../../../treelist"
import type { IConfig } from "../abstractions"
import type { INavItem, INavCore } from "./abstractions/types"
import NavGroup from "./NavGroup"
import NavItem from "./NavItem"

export function createNavGroup(input: { id: string; title: string; icon: string }): INavCore {
    return Object.assign(new NavGroup(), input)
}
export function createNavItem(input: IConfig, parentId?: string): INavItem {
    return Object.assign(new NavItem(), {
        id: input.key,
        parentId: parentId,
        icon: input.key ?? input.name,
        routeName: `${input.key ?? input.name}Overview`,
        title: input.overviewTitle,
        description: input.description,
        initialQuery: input.initialQuery ?? {},
    })
}

type IGroupedEntities = [string, Array<string>]
export type IImportDashboardInput = {
    groups: Array<{ id: string; title: string; icon: string }>
    entities: Array<IGroupedEntities>
    configs: Array<IConfig>
    hasAccess: (config: IConfig) => boolean
}
function resolveEntityConfigs(keys: Array<string>, configs: Array<IConfig>): Array<IConfig> {
    return keys.flatMap((key) => {
        const config = configs.find((x) => x.key == key)
        if (!config) {
            console.warn(
                `[regira] navigation entry "${key}" matches no registered entity config (expected the entity key, e.g. "Article") — skipping.`
            )
            return []
        }
        return [config]
    })
}
export function importDashboard(input: IImportDashboardInput): Array<INavCore> {
    const navEntities = input.entities!.flatMap(([parentId, items]) =>
        resolveEntityConfigs(items, input.configs)
            .filter((config) => input.hasAccess(config))
            .map((config) => createNavItem(config, parentId))
    )
    const navGroups = input.groups!.filter((g) => navEntities.some((e) => e.parentId == g.id)).map((x) => createNavGroup(x))
    return navGroups.concat(navEntities)
}
export type IImportNavbarInput = {
    groups?: Array<{ id: string; title: string; icon: string }>
    entities: Array<string | IGroupedEntities>
    configs: Array<IConfig>
    hasAccess: (config: IConfig) => boolean
}
export function importNavbar(input: IImportNavbarInput): Array<INavCore> {
    const groups = input.groups?.map(createNavGroup)
    return input.entities!.flatMap((x) => {
        if (x.length == 2 && Array.isArray(x[1])) {
            const group = groups?.find((g) => g.id == x[0])
            if (!group) {
                console.warn(`[regira] navigation group "${x[0]}" matches no entry in navigation.groups — skipping.`)
                return []
            }
            const navItems = resolveEntityConfigs(x[1], input.configs)
                .filter((config) => input.hasAccess(config))
                .map((config) => createNavItem(config, group.id))
            return [group, ...navItems]
        }
        // else
        const [config] = resolveEntityConfigs([x as string], input.configs)
        return config && input.hasAccess(config) ? [createNavItem(config)] : []
    })
}

export function buildNavigationTree(items: Array<INavCore>): TreeList<INavCore> {
    return new TreeList<INavCore>().init(items, (value, candidates) => candidates.filter((x) => x.id == value.parentId))
}

export function isNavItem(item: INavCore) {
    return item instanceof NavItem
}
