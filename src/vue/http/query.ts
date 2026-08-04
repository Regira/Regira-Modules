import { stringifyDate } from "../../utilities/datetime-utility"

/**
 * Serializes one query-string value, or returns `undefined` to omit the key entirely.
 *
 * A `Date` goes through `stringifyDate` — the same local-wall-clock ISO-8601 form `dateExtensions.use()`
 * gives request bodies — because the default coercion (`Date.prototype.toString()`) yields
 * `"Wed Jul 29 2026 07:00:00 GMT+0200 (…)"`, which ASP.NET Core's `DateTime` model binder rejects with a 400
 * before any application code runs. Bodies pass through `JSON.stringify` (so `toJSON` applies); query strings
 * never do, which is why this lives here.
 *
 * An **invalid** `Date` (`new Date("nope")`) is omitted rather than sent as an empty value: `?from=` reads on
 * the wire as "filter by an empty string" and binds to `default`, which is a silently wrong result set. A
 * missing key means "no filter", which is what an unparseable input actually expresses.
 */
const toQueryValue = (value: unknown): string | undefined => (value instanceof Date ? stringifyDate(value) : String(value))

export function createQueryString(o: object): URLSearchParams {
    const p = new URLSearchParams()
    Object.entries(o || {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            ;(value as Array<unknown>).forEach((v) => {
                const serialized = toQueryValue(v)
                if (serialized !== undefined) p.append(key, serialized)
            })
        } else {
            const serialized = toQueryValue(value)
            if (serialized !== undefined) p.append(key, serialized)
        }
    })
    return p
}
