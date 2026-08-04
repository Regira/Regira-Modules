import { watch, onMounted, type Ref, type WatchStopHandle } from "vue"
import { useRouter } from "vue-router"
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
            {
                ...currentRoute.query, // values that should be removed should explicitly be overwritten by <<null|undefined>> in searchObject
                ...searchObject.value,
                ...(pagingInfo.value ?? {}),
            },
            defaultPageSize
        )

        const route = {
            ...currentRoute,
            query,
        }
        router.push(route as Parameters<typeof router.push>[0])
    }

    async function routeSearchHandler(): Promise<void> {
        const { searchObject: so, pagingInfo: pi } = parseQueryParams(router.currentRoute.value.query)
        if (!pi.page) {
            pi.page = 1
        }
        if ((pi.pageSize == null || isNaN(pi.pageSize)) && defaultPageSize > 0) {
            pi.pageSize = defaultPageSize
        }
        if (searchObject.value != null) {
            searchObject.value = so
        }
        if (pagingInfo.value != null) {
            pagingInfo.value = pi
        }
        await handler()
    }

    const routeWatcher = watch(router.currentRoute, async (newRoute, oldRoute) => {
        // only when staying on the same page
        if (newRoute.name === oldRoute.name) {
            await routeSearchHandler()
        }
    })

    onMounted(routeSearchHandler)

    return {
        updateOverviewRoute,
        routeSearchHandler,
        routeWatcher,
    }
}

export default useRouteOverview
