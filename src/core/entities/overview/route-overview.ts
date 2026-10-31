import type { Box } from "../../box"
import { stringifyDate } from "../../../utilities/datetime-utility"
import { parseQueryParams, cleanQueryParams } from "../utilities/query"
import { DEFAULT_PAGESIZE, type IPagingInfo, type ISearchObject } from "../abstractions"

export type RouteQuery = Record<string, unknown>
/** what the overview needs of a route: which page it is, and its full path */
export type RouteState = { name?: unknown; fullPath: string }

export type RouteOverviewInput<SO extends ISearchObject = ISearchObject> = {
    pagingInfo: Box<IPagingInfo>
    searchObject: Box<SO>
    defaultPageSize?: number
    handler(): Promise<void>
    /** the current route's query */
    query(): RouteQuery
    /** goes to the current page with this query */
    navigate(query: RouteQuery): void
}
export type RouteOverview = {
    updateOverviewRoute(resetPaging?: boolean): void
    routeSearchHandler(): Promise<void>
    /** the first search, when the view mounts: a query without search parameters keeps the search object's defaults */
    load(): Promise<void>
}

// A router coerces a query value with String(), which turns a Date into Date.prototype.toString() — a value the
// API's DateTime binder rejects. Serialize it the way the request's own query string does (http/query.ts).
export const toRouteValue = (value: unknown): unknown =>
    value instanceof Date ? stringifyDate(value) : Array.isArray(value) ? value.map(toRouteValue) : value

/**
 * A navigation the overview searches again for: the same page with another query. A hash-only change (a tab
 * selection) is not one — the query did not move, and re-reading it would drop the search object's defaults.
 */
export function isNewQuery(next: RouteState, previous: RouteState): boolean {
    const withoutHash = (fullPath: string) => fullPath.split("#")[0]
    return next.name === previous.name && withoutHash(next.fullPath) !== withoutHash(previous.fullPath)
}

export function createRouteOverview<SO extends ISearchObject = ISearchObject>({
    pagingInfo,
    searchObject,
    defaultPageSize = DEFAULT_PAGESIZE,
    handler,
    query,
    navigate,
}: RouteOverviewInput<SO>): RouteOverview {
    function updateOverviewRoute(resetPaging = false): void {
        if (resetPaging && pagingInfo != null) {
            pagingInfo.value = {
                ...pagingInfo?.value,
                page: 1,
            }
        }

        // remove empty parameters (null/undefined) from query
        navigate(
            cleanQueryParams(
                Object.fromEntries(
                    Object.entries({
                        ...query(), // values that should be removed should explicitly be overwritten by <<null|undefined>> in searchObject
                        ...searchObject.value,
                        ...(pagingInfo.value ?? {}),
                    }).map(([key, value]) => [key, toRouteValue(value)])
                ),
                defaultPageSize
            )
        )
    }

    // `keepInitial`: a query that carries no search parameters leaves the search object as the view created it, so
    // the defaults it was given apply. Only the first search does this — later, an empty query means the user
    // cleared the filters.
    async function applyRoute(keepInitial: boolean): Promise<void> {
        const { searchObject: so, pagingInfo: pi } = parseQueryParams(query())
        if (!pi.page) {
            pi.page = 1
        }
        if ((pi.pageSize == null || isNaN(pi.pageSize)) && defaultPageSize > 0) {
            pi.pageSize = defaultPageSize
        }
        if (searchObject.value != null && !(keepInitial && Object.keys(so).length === 0)) {
            searchObject.value = so as SO
        }
        if (pagingInfo.value != null) {
            pagingInfo.value = pi
        }
        await handler()
    }

    return {
        updateOverviewRoute,
        routeSearchHandler: () => applyRoute(false),
        load: () => applyRoute(true),
    }
}
