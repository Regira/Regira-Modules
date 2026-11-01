export enum NavTypes {
    dashboard = "Dashboard",
    navbar = "Navbar",
}

// index signature is intentionally `any` so apps can add & read arbitrary extra config fields without casts
export interface IConfig extends Record<string, any> {
    name?: string
    key: string
    requires?: Array<string>
    isComplex?: boolean
    /**
     * whether the signed-in user may create, edit and delete this entity — while it answers false the scaffolded
     * Overview has no "New" button and read-only rows, and Details a read-only form; absent, everyone may. It hides
     * buttons only: the API stays the one place writes are authorized
     */
    canWrite?: () => boolean

    /** the slice's URL path, without the leading "/": one segment ("products") or several ("admin/products") */
    routePrefix: string
    baseQueryParams?: Record<string, unknown>
    initialQuery?: Record<string, unknown>

    overviewTitle?: string
    detailsTitle?: string
    description?: string
    icon?: string

    defaultPageSize: number

    api: string
    detailsUrl?: string
    listUrl?: string
    searchUrl?: string
    saveUrl?: string
    deleteUrl?: string
}
