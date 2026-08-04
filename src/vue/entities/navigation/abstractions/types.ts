export interface INavCore {
    id: string
    parentId?: string
    title: string
    description?: string
    icon?: string
}
export interface IRoutingNavItem {
    routeName: string
    initialQuery?: Record<string, unknown>
}
export interface INavItem extends INavCore, IRoutingNavItem {}
