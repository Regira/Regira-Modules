// Fake entity services the scenarios drive a controller with.

/** a service whose calls you settle by hand, in whatever order the test needs */
export function deferredService(...methods) {
    const pending = []
    const service = {
        resolveWith: (index, result) => pending[index].resolve(result),
        rejectWith: (index, error) => pending[index].reject(error),
    }
    for (const method of methods) {
        service[method] = () => new Promise((resolve, reject) => pending.push({ resolve, reject }))
    }
    return service
}

/** `total` rows on a server that pages them (at most `maxPageSize` per request, as the API's MaxPageSize does) */
export function pagedService(total = 60, maxPageSize = 100) {
    const rows = Array.from({ length: total }, (_, i) => ({ $id: i + 1 }))
    const requests = []
    return {
        rows,
        requests,
        search: async (so) => {
            requests.push({ page: so.page, pageSize: so.pageSize })
            const pageSize = Math.min(so.pageSize, maxPageSize)
            const start = (so.page - 1) * pageSize
            return { items: rows.slice(start, start + pageSize), count: rows.length }
        },
    }
}

/** the same server, but each request waits until the test releases it */
export function heldService(total = 60) {
    const inner = pagedService(total)
    const held = []
    return {
        ...inner,
        search: (so) => new Promise((resolve) => held.push(() => inner.search(so).then(resolve))),
        release: () => held.shift()(),
        get waiting() {
            return held.length
        },
    }
}
