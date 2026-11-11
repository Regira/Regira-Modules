/** the keys of T whose type admits a `Date` — the fields `liftDates` accepts */
export type DateKeys<T> = { [K in keyof T]-?: Date extends T[K] ? K : never }[keyof T]

/**
 * Converts the named fields of `item` from the ISO strings the API sends to `Date`, in place, and returns `item` —
 * for a service's `toEntity`, where only `created` and `lastModified` are hydrated for you. Only a string is converted
 * (an empty or unparseable one becomes `undefined`); a `Date`, `null` or `undefined` is left as it is, so a second call
 * changes nothing, as `toEntity` requires. A `DateOnly`/`TimeOnly` field stays a string: never name one here.
 */
export function liftDates<T extends object>(item: T, ...fields: Array<DateKeys<T>>): T {
    const target = item as Record<PropertyKey, unknown>
    for (const field of fields as Array<PropertyKey>) {
        const value = target[field]
        if (typeof value !== "string") continue
        const date = new Date(value)
        target[field] = value && !isNaN(date.getTime()) ? date : undefined
    }
    return item
}
