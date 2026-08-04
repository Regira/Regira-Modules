import type { IPagingInfo } from "../../entities/abstractions/PagingInfo"
import { computed, type AllowedComponentProps, type ComputedRef, type Ref, type VNodeProps } from "vue"
import { useRouter, type RouteLocationRaw } from "vue-router"
import { PAGING_DEFAULTS } from "./defaults"
import { useScreen } from "../screen"

export enum ButtonType {
    anchor = "Anchor",
    button = "Button",
}
export type PagingEmits = {
    (e: "update:modelValue", args: any): void
    (e: "change", args: any): void
}
export type PagingProps = {
    modelValue: IPagingInfo
    count: number
    maxPages?: number
    buttonType?: ButtonType
}
export type PagingSlots = {
    firstPage?(props: { page: number }): any
    default?(props: { page: number; route: string; handleChange: (page: number) => void }): any
    lastPage?(props: { page: number }): any
}
export const pagingDefaults = {
    maxPages: 9,
    buttonType: ButtonType.anchor,
}

/** any component implementing the paging contract (props checked at the registration site) */
export type PagingComponent = new (...args: any[]) => {
    $props: PagingProps & AllowedComponentProps & VNodeProps
}

export type ResultSummaryProps = {
    visibleCount?: number
    totalCount?: number
}
export type ResultSummarySlots = {
    default?(props: { visibleCount?: number; totalCount?: number }): any
}

export type PagingIn = {
    pagingInfo: Ref<IPagingInfo>
    count: Ref<number>
    maxPages: number
    emit: PagingEmits
}
export type PagingOut = {
    pagedRoute(p: number): string
    page: ComputedRef<number>

    totalPages: ComputedRef<number>
    totalVisiblePages: ComputedRef<number>
    firstPage: ComputedRef<number>
    lastPage: ComputedRef<number>
    pages: ComputedRef<Array<number>>
    /** the effective button budget — half of `maxPages` below the sm breakpoint */
    visibleMaxPages: ComputedRef<number>

    handleChangePage(newPage: number): void
}

export default function usePaging({ pagingInfo, count, maxPages, emit }: PagingIn): PagingOut {
    //const { modelValue = { page: 1, pageSize: PAGING_DEFAULTS.PAGESIZE }, count, maxPages = 9 } = props;
    // Half the buttons on a phone. Reactive on purpose: reading window.innerWidth once at setup meant a list
    // opened on a tablet and rotated (or split-screened) to a narrow viewport kept the full-width button row
    // and pushed the page into horizontal overflow. useScreen owns the shared, debounced resize subscription.
    const { screen } = useScreen()
    const visibleMaxPages = computed(() => (screen.isSmall ? maxPages : Math.ceil(maxPages / 2)))

    const defaultPageSize = computed(
        () => (!isNaN(parseInt(pagingInfo.value.pageSize + "")) ? pagingInfo.value.pageSize : undefined) || PAGING_DEFAULTS.PAGESIZE
    )

    const router = useRouter()
    function pagedRoute(p: number): string {
        const { name, path, hash, query } = router.currentRoute.value
        const currentRoute = { name, path, hash, query }
        const route: RouteLocationRaw = {
            name: currentRoute.name || undefined,
            query: {
                ...currentRoute.query,
                page: p,
            },
        }
        if (p <= 1) {
            delete route.query!.p
        }
        return router.resolve(route).fullPath
    }
    const page = computed(() => pagingInfo.value.page || 1)
    const totalPages = computed(() => Math.ceil(count.value / defaultPageSize.value))
    const totalVisiblePages = computed(() => Math.min(totalPages.value, visibleMaxPages.value))
    const firstPage = computed(() => {
        const halfPages = Math.floor(totalVisiblePages.value / 2)
        let firstPage = Math.max(page.value - halfPages, 1)
        if (firstPage + visibleMaxPages.value > totalPages.value) {
            firstPage -= firstPage + visibleMaxPages.value - totalPages.value - 1
        }
        return Math.max(firstPage, 1)
    })
    const lastPage = computed(() => Math.min(firstPage.value + totalVisiblePages.value, totalPages.value))
    const pages = computed(() => {
        return !isNaN(totalVisiblePages.value) && totalVisiblePages.value > 0
            ? Array(totalVisiblePages.value)
                  .fill(0)
                  .map((_, i) => firstPage.value + i)
                  .filter((x) => x <= lastPage.value)
            : []
    })

    function handleChangePage(newPage: number): void {
        const modelValue = {
            ...pagingInfo.value,
            page: newPage,
        }

        emit("update:modelValue", modelValue)
        emit("change", modelValue)
    }

    return {
        pagedRoute,
        page,

        totalPages,
        totalVisiblePages,
        firstPage,
        lastPage,
        pages,
        visibleMaxPages,

        handleChangePage,
    }
}
