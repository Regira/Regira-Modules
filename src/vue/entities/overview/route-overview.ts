import { watch, onMounted, type Ref, type WatchStopHandle } from "vue"
import { useRouter } from "vue-router"
import { stringifyDate } from "../../../utilities/datetime-utility"
import { parseQueryParams, cleanQueryParams } from "../utilities/query"
import { DEFAULT_PAGESIZE, type IPagingInfo, type ISearchObject } from "../abstractions"

export type RouteOverviewIn<SO extends ISearchObject = ISearchObject> = {
    pagingInfo: Ref<IPagingInfo>
    searchObject: Ref<SO>
    defaultPageSize?: number
    handler(): Promise<void>
}
export type RouteOverviewOut = {
    updateOverviewRoute(resetPaging?: boolean): void
    routeSearchHandler(): Promise<void>
    routeWatcher: WatchStopHandle
}

// vue-router coerces a query value with String(), which turns a Date into Date.prototype.toString() — a value the
// API's DateTime binder rejects. Serialize it the way the request's own query string does (http/query.ts).
const toRouteValue = (value: unknown): unknown =>
    value instanceof Date ? stringifyDate(value) : Array.isArray(value) ? value.map(toRouteValue) : value

export function useRouteOverview({ pagingInfo, searchObject, defaultPageSize = DEFAULT_PAGESIZE, handler }: RouteOverviewIn): RouteOverviewOut {
    const router = useRouter()

    function updateOverviewRoute(resetPaging = false): void {
        if (resetPaging && pagingInfo != null) {
            pagingInfo.value = {
                ...pagingInfo?.value,
                page: 1,
            }
        }

        const currentRoute = router.currentRoute.value

        // remove empty parameters (null/undefined) from query
        const query = cleanQueryParams(
            Object.fromEntries(
                Object.entries({
                    ...currentRoute.query, // values that should be removed should explicitly be overwritten by <<null|undefined>> in searchObject
                    ...searchObject.value,
                    ...(pagingInfo.value ?? {}),
                }).map(([key, value]) => [key, toRouteValue(value)])
            ),
            defaultPageSize
        )

        const route = {
            ...currentRoute,
            query,
        }
        router.push(route as Parameters<typeof router.push>[0])
    }

    // `keepInitial`: a URL that carries no search parameters leaves the search object as the view created it, so
    // the defaults it was given apply. Only the first search does this — later, an empty query means the user
    // cleared the filters.
    async function applyRoute(keepInitial: boolean): Promise<void> {
        const { searchObject: so, pagingInfo: pi } = parseQueryParams(router.currentRoute.value.query)
        if (!pi.page) {
            pi.page = 1
        }
        if ((pi.pageSize == null || isNaN(pi.pageSize)) && defaultPageSize > 0) {
            pi.pageSize = defaultPageSize
        }
        if (searchObject.value != null && !(keepInitial && Object.keys(so).length === 0)) {
            searchObject.value = so
        }
        if (pagingInfo.value != null) {
            pagingInfo.value = pi
        }
        await handler()
    }

    const routeSearchHandler = (): Promise<void> => applyRoute(false)

    const routeWatcher = watch(router.currentRoute, async (newRoute, oldRoute) => {
        // only when staying on the same page, and not for a hash-only change (a tab selection): the query did not
        // move, so there is nothing to search — and re-reading it would drop the search object's defaults
        const withoutHash = (fullPath: string) => fullPath.split("#")[0]
        if (newRoute.name === oldRoute.name && withoutHash(newRoute.fullPath) !== withoutHash(oldRoute.fullPath)) {
            await routeSearchHandler()
        }
    })

    onMounted(() => applyRoute(true))

    return {
        updateOverviewRoute,
        routeSearchHandler,
        routeWatcher,
    }
}
