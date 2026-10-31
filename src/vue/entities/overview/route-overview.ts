import { watch, onMounted, type Ref, type WatchStopHandle } from "vue"
import { useRouter } from "vue-router"
import { DEFAULT_PAGESIZE, type IPagingInfo, type ISearchObject } from "../../../core/entities/abstractions"
import { createRouteOverview, isNewQuery } from "../../../core/entities/overview/route-overview"

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
    const { updateOverviewRoute, routeSearchHandler, load } = createRouteOverview({
        pagingInfo,
        searchObject,
        defaultPageSize,
        handler,
        query: () => router.currentRoute.value.query,
        navigate: (query) => router.push({ ...router.currentRoute.value, query } as Parameters<typeof router.push>[0]),
    })

    const routeWatcher = watch(router.currentRoute, async (newRoute, oldRoute) => {
        if (isNewQuery(newRoute, oldRoute)) {
            await routeSearchHandler()
        }
    })

    onMounted(load)

    return {
        updateOverviewRoute,
        routeSearchHandler,
        routeWatcher,
    }
}
