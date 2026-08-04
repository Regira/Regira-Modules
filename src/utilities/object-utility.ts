import { trim } from "./string-utility"

// consider using https://www.npmjs.com/package/is-plain-object
export const isPlainObject = (obj: unknown): obj is Record<string, unknown> =>
    typeof obj === "object" && obj !== null && Object.prototype.toString.call(obj) === "[object Object]"

export const flattenObject = (obj: Record<string, unknown>): Record<string, unknown> => {
    const getKey = (key: string, prefix: string) => (prefix === "" ? key : `${prefix}.${key}`)
    const flattenProperties = (obj: unknown, prefix = "", result: Record<string, unknown> = {}): Record<string, unknown> => {
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                flattenProperties(obj, `${prefix}[${i}]`, result)
            }
        } else if (typeof obj !== "object") {
            result[prefix] = obj
        } else {
            for (const entry of Object.entries(obj as Record<string, unknown>)) {
                const name = entry[0]
                const value = entry[1]
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        const arrKey = getKey(`${name}[${i}]`, prefix)
                        flattenProperties(value[i], arrKey, result)
                    }
                } else {
                    const objKey = getKey(name, prefix)
                    if (typeof value === "object" && value !== null && Object.keys(value as object).length > 0) {
                        flattenProperties(value, objKey, result)
                    } else {
                        result[objKey] = value
                    }
                }
            }
        }
        return result
    }

    return flattenProperties(obj)
}
export const crawlObject = (obj: Record<string, unknown>, key: string) =>
    key.split(".").reduce<unknown>((res, p) => (res == null ? undefined : (res as Record<string, unknown>)[p]), obj)
export const removeEmpty = (obj: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
        Object.entries(obj)
            .filter(([, value]) => value != null)
            .map(([key, value]) => (typeof value === "object" ? [key, removeEmpty(value as Record<string, unknown>)] : [key, value]))
    )

interface DeepCopyCacheEntry {
    original: unknown
    copy: unknown
}

export const deepCopy = <T>(obj: T): T => {
    // Prefer the native structured clone algorithm: it handles Dates, Maps, Sets, typed
    // arrays and circular references. It throws on non-cloneable values (functions, DOM
    // nodes, symbols), so fall back to the manual copy which tolerates those.
    if (typeof structuredClone === "function") {
        try {
            return structuredClone(obj)
        } catch {
            /* fall through to the manual copy below */
        }
    }

    // https://github.com/vuejs/vuex/blob/dev/src/util.js
    const find = (list: DeepCopyCacheEntry[], f: (c: DeepCopyCacheEntry) => boolean) => list.filter(f)[0]
    const copyWithCache = (o: unknown, cache: DeepCopyCacheEntry[] = []): unknown => {
        if (o === null || typeof o !== "object") {
            return o
        }

        const hit = find(cache, (c: DeepCopyCacheEntry) => c.original === o)
        if (hit) {
            return hit.copy
        }

        if (o instanceof Date) {
            return new Date(o)
        }

        const copy: Record<string, unknown> | unknown[] = Array.isArray(o) ? [] : {}
        cache.push({ original: o, copy })

        Object.keys(o as object).forEach((key) => {
            ;(copy as Record<string, unknown>)[key] = copyWithCache((o as Record<string, unknown>)[key], cache)
        })

        return copy
    }

    return copyWithCache(obj) as T
}

export const mixin = <T extends Record<string, unknown>>(target: T, ...rest: Record<string, unknown>[]): T => {
    // https://github.com/jonschlinkert/mixin-deep/blob/master/index.js
    function mixinProp(target: Record<string, unknown>, val: unknown, key: string): Record<string, unknown> {
        const obj = target[key]
        if (isPlainObject(val) && isPlainObject(obj)) {
            target[key] = merge(obj as Record<string, unknown>, val as Record<string, unknown>)
        } else {
            target[key] = val
        }
        return target
    }
    function merge(obj1: Record<string, unknown>, obj2: Record<string, unknown>): Record<string, unknown> {
        return Object.keys(obj2).reduce((obj, key) => mixinProp(obj, obj2[key], key), obj1)
    }

    return rest.reduce<Record<string, unknown>>((r, obj) => merge(r, obj), target) as T
}

const getKeys = (keyFilter: Record<string, unknown> | null | undefined) =>
    keyFilter ? Object.keys(keyFilter).filter((x) => typeof keyFilter[x] !== "undefined") : []
export const filterObject = (obj: Record<string, unknown>, filter: Record<string, unknown>): boolean => {
    const keys = getKeys(filter)
    return (
        !keys.length ||
        keys.every((key) => {
            const filterValue = filter[key]
            if (typeof filterValue === "function") {
                return (filterValue as (...args: unknown[]) => boolean).apply(obj, [key])
            }
            if (filterValue instanceof Date || typeof filterValue === "number") {
                if (!(key in obj)) {
                    const objKey = key[3]!.toLowerCase() + (key.length > 4 ? key.substring(4) : "")
                    const objValue = obj[objKey]
                    if (key.startsWith("min")) {
                        return (objValue as number) >= (filterValue as number)
                    }
                    if (key.startsWith("max")) {
                        return (objValue as number) <= (filterValue as number)
                    }
                }
            }
            //add wildcard to key so logic can be inside views
            const trimmedKey = trim(key, "*")
            if (typeof filterValue === "string" && (typeof obj[trimmedKey] === "string" || typeof obj[trimmedKey] == "undefined")) {
                const value = filterValue?.toUpperCase()
                const objValue = (obj[trimmedKey] as string | undefined)?.toUpperCase()
                if (objValue == null && value != null) {
                    return false
                }
                if (key.startsWith("*") && key.endsWith("*")) {
                    return objValue?.includes(value) ?? false
                } else if (key.startsWith("*")) {
                    return objValue?.endsWith(value) ?? false
                } else if (key.endsWith("*")) {
                    return objValue?.startsWith(value) ?? false
                }
            }
            if (key in obj) {
                const objValue = obj[key]
                if (Array.isArray(filterValue) && !Array.isArray(objValue)) {
                    return filterValue.some((k) => k == objValue)
                } else if (Array.isArray(objValue) && !Array.isArray(filterValue)) {
                    return objValue.some((k) => k == filterValue)
                } else if (Array.isArray(objValue) && Array.isArray(filterValue)) {
                    return filterValue.every((fk) => objValue.some((k) => k == fk))
                }
                if (filterValue instanceof Object) {
                    // recursive call
                    return filterObject(objValue as Record<string, unknown>, filterValue as Record<string, unknown>)
                }
                // allow flexible comparison ('2' == 2)
                return objValue == filterValue
            }
            return true
        })
    )
}

export default {
    isPlainObject,
    flattenObject,
    crawlObject,
    mixin,
    filterObject,
}
