import type { IPagingInfo } from "../abstractions/PagingInfo"

export function cleanQueryParams(queryParams: Record<string, unknown>, _defaultPageSize?: number): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(queryParams).filter(([key, value]) => {
            return (
                value != null &&
                // no private values (like $meta)
                key[0] != "$" &&
                (key !== "page" || (value as number) > 1)
                //&& (key !== "pageSize" || (value > 0 && value !== defaultPageSize))
            )
        })
    )
}
export function parseQueryParams(queryParams: Record<string, unknown>): { searchObject: Record<string, unknown>; pagingInfo: IPagingInfo } {
    const { page, pageSize, ...searchObject } = queryParams
    const pagingInfo: IPagingInfo = {
        page: parseInt(page as string) || 1,
        pageSize: parseInt(pageSize as string),
    }
    return { searchObject, pagingInfo }
}
