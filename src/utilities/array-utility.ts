import { filterObject } from "./object-utility"
import { naturalCompare, getRandom } from "./number-utility"

type Comparable = number | string | bigint | boolean

const selfSelector = <T>(x: T): T => x
const compareAsc = <T>(a: T, b: T, f: (x: T) => unknown): number => {
    const fa = f(a) as Comparable,
        fb = f(b) as Comparable
    return fa < fb ? -1 : fa > fb ? 1 : 0
}
const compareDesc = <T>(a: T, b: T, f: (x: T) => unknown): number => {
    const fa = f(a) as Comparable,
        fb = f(b) as Comparable
    return fa > fb ? -1 : fa < fb ? 1 : 0
}

export const isArray = (items: unknown): items is unknown[] => Array.isArray(items)
export const isIterable = (items: unknown): boolean =>
    items != null && typeof (items as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function"
export const toArray = <T>(items: T[] | Iterable<T> | Record<string, T> | null | undefined): T[] => {
    if (!items) return []
    if (isArray(items)) return items as T[]
    if (isIterable(items)) return [...(items as Iterable<T>)]
    return Object.values(items as Record<string, T>)
}
export const newArray = (length: number): undefined[] => [...Array(length)]

export const orderBy = <T>(items: Iterable<T>, selector: (x: T) => unknown = selfSelector): T[] => {
    const arr = [...items]
    arr.sort((a, b) => compareAsc(a, b, selector))
    return arr
}
export const orderByDesc = <T>(items: Iterable<T>, selector: (x: T) => unknown = selfSelector): T[] => {
    const arr = [...items]
    arr.sort((a, b) => compareDesc(a, b, selector))
    return arr
}
export const naturalSort = <T>(items: Iterable<T>, selector: (x: T) => string | number = selfSelector as (x: T) => string | number): T[] => {
    const arr = [...items]
    arr.sort((a, b) => naturalCompare(a, b, selector))
    return arr
}
export const shuffle = <T>(items: Iterable<T>): T[] => {
    const source = [...items] // copy array
    return [...Array(source.length)].map(() => {
        const index = getRandom(source.length - 1)
        return source.splice(index, 1)[0] as T
    })
}
export const innerJoin = <T, U = T, R = T>(
    items1: Iterable<T>,
    items2: Iterable<U>,
    selector1: (x: T) => unknown = selfSelector,
    selector2: (x: U) => unknown = selfSelector,
    resultSelector: (x: T, y: U) => R = (x: T) => x as unknown as R
) => {
    const result: R[] = []
    const arr1 = toArray(items1)
    const arr2 = toArray(items2)
    arr1.forEach((x) => {
        const joinedItems = arr2.filter((y) => selector1(x) === selector2(y))
        joinedItems.forEach((y) => {
            result.push(resultSelector(x, y))
        })
    })
    return result
}
export const groupBy = <T, K = unknown>(items: Iterable<T>, keySelector: (x: T, i?: number, arr?: T[]) => K): [K, T[]][] => {
    // return [
    //   ...toMap(items, keySelector, (v, i, map) => {
    //     const key = keySelector(v);
    //     if (!map.has(key)) {
    //       return [v];
    //     }
    //     const currentValue = map.get(key);
    //     return currentValue.concat(v);
    //   }),
    // ];
    const arr = toArray(items)
    const keys = distinct(arr.map(keySelector))
    return keys.map((key): [K, T[]] => [key, arr.filter((y, j, a) => key === keySelector(y, j, a))])
}
export const groupJoin = <T, U, R = [T, U[]]>(
    parentItems: Iterable<T>,
    childItems: Iterable<U>,
    parentKeySelector: (x: T, i?: number, arr?: T[]) => unknown = selfSelector,
    childSelector: (x: U, i?: number, arr?: U[]) => unknown = selfSelector,
    resultSelector: (parent: T, children: U[]) => R = (parent: T, children: U[]) => [parent, children] as unknown as R
) => {
    const childArr = toArray(childItems)
    return toArray(parentItems)
        .map((x, i, parents): [T, U[]] => [
            x,
            childArr.filter((y, j, children) => parentKeySelector(x, i, parents) === childSelector(y, j, children)),
        ])
        .map(([groupedKey, groupedValues]) => resultSelector(groupedKey, groupedValues))
}
export const except = <T, U = T>(
    items1: Iterable<T>,
    items2: Iterable<U>,
    selector1: (x: T) => unknown = selfSelector,
    selector2: (x: U) => unknown = selfSelector
): T[] => {
    const arr2 = toArray(items2)
    return toArray(items1).filter((x) => !arr2.some((y) => selector1(x) === selector2(y)))
}
export const count = <T>(items: Iterable<T>, predicate?: (x: T) => boolean): number => {
    const arr = toArray(items)
    return predicate ? arr.filter(predicate).length : arr.length
}
export const first = <T>(items: Iterable<T>, predicate?: (x: T) => boolean): T | undefined => {
    const arr = toArray(items)
    if (!predicate) {
        return arr[0]
    }
    return arr.find(predicate)
}
export const last = <T>(items: Iterable<T>, predicate?: (x: T) => boolean): T | undefined => {
    const arr = toArray(items)
    if (!predicate) {
        return arr.length ? arr[arr.length - 1] : undefined
    }
    for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i]!)) {
            return arr[i]
        }
    }
    return undefined
}
export const distinctBy = <T>(items: Iterable<T>, selector: (x: T) => unknown): T[] => {
    const arr = toArray(items)
    return arr.reduce<T[]>((r, v) => (r.some((x) => selector(x) === selector(v)) ? r : r.concat([v])), [])
}
export const distinct = <T>(items: Iterable<T>): T[] => {
    return [...new Set(toArray(items))]
    //return distinctBy(items, selfSelector);
}
export const union = <T>(arr1: Iterable<T>, arr2: Iterable<T>): T[] => {
    return distinct(toArray(arr1).concat(toArray(arr2)))
}
export const take = <T>(items: Iterable<T>, n: number): T[] => {
    return toArray(items).slice(0, n)
}
export const skip = <T>(items: Iterable<T>, n: number): T[] => {
    return toArray(items).slice(n)
}
export const page = <T>(items: Iterable<T>, pageSize: number, pageIndex: number = 0): T[] => {
    const skip = pageSize * pageIndex
    return toArray(items).slice(skip, skip + pageSize)
}
export const countPages = (items: Iterable<unknown>, pageSize: number): number => {
    const totalSize = toArray(items).length
    return Math.ceil(totalSize / pageSize)
}

export const min = <T>(items: Iterable<T>, selector: (x: T) => unknown = selfSelector) => {
    //return Math.min(...items.map(selector)); -> only numeric
    const arr = toArray(items)
    if (!arr.length) {
        return undefined
    }
    return arr.reduce<Comparable | undefined>((r, x) => {
        const v = selector(x) as Comparable
        if (r == null) return v
        return v < r ? v : r
    }, undefined)
}
export const max = <T>(items: Iterable<T>, selector: (x: T) => unknown = selfSelector) => {
    //return Math.max(...items.map(selector)); -> only numeric
    const arr = toArray(items)
    if (!arr.length) {
        return undefined
    }
    return arr.reduce<Comparable | undefined>((r, x) => {
        const v = selector(x) as Comparable
        if (r == null) return v
        return v > r ? v : r
    }, undefined)
}
export const sum = <T>(items: Iterable<T>, selector?: (x: T) => number): number => {
    const sel = selector ?? (selfSelector as unknown as (x: T) => number)
    return toArray(items).reduce((r, x) => r + sel(x), 0)
}
export const average = <T>(items: Iterable<T>, selector?: (x: T) => number): number => {
    const arr = toArray(items)
    return sum(arr, selector) / arr.length
}
export const toMap = <T, K, V = T>(
    items: Iterable<T>,
    keySelector: (x: T) => K,
    valueSelector?: (item: T, i?: number, map?: Map<K, V>) => V
): Map<K, V> => {
    const sel = valueSelector ?? (selfSelector as unknown as (item: T, i?: number, map?: Map<K, V>) => V)
    const arr = toArray(items)
    return arr.reduce((map, item, i) => {
        const key = keySelector(item)
        const value = sel(item, i, map)
        return map.set(key, value)
    }, new Map<K, V>())
    // const entries = groupBy(items, keySelector).map(x => [x[0], x[1].map(valueSelector)]);
    // return new Map(entries);
}
export const sameContent = <T>(
    items1: Iterable<T> | null | undefined,
    items2: Iterable<T> | null | undefined,
    includeOrder: boolean = true
): boolean => {
    if (items1 === items2) {
        return true
    }
    if (items1 == null || items2 == null) {
        return false
    }
    const arr1 = toArray(items1)
    const arr2 = toArray(items2)
    if (arr1.length !== arr2.length) {
        return false
    }
    if (includeOrder) {
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) {
                return false
            }
        }
        return true
    }
    // same order not required
    return innerJoin(arr1, arr2).length === arr1.length
}

export const query = <T>(items: Iterable<T>, filter: Partial<T>): T[] => {
    const arr = toArray(items)
    return arr.filter((x) => filterObject(x as Record<string, unknown>, filter as Record<string, unknown>))
}
export const getEnumerator = <T>(arr: T[]) => {
    let index = 0
    return {
        get selectedIndex() {
            return index
        },
        set selectedIndex(value: number) {
            if (value >= 0 && value < arr.length) {
                index = value
            }
        },
        get length() {
            return arr.length
        },
        get current(): T | undefined {
            if (index >= 0 && index < arr.length) {
                return arr[index]
            }
            return undefined
        },
        first() {
            index = 0
        },
        previous() {
            if (index > 0) {
                index--
            }
            return index > 0
        },
        next() {
            if (index < arr.length - 1) {
                index++
            }
            return index < arr.length
        },
        last() {
            index = arr.length - 1
        },
    }
}

// no pure functions
export const move = <T>(arr: T[], item: T, pos: number): void => {
    const index = arr.indexOf(item)
    if (index !== -1) {
        arr.splice(index, 1)
        arr.splice(pos, 0, item)
    }
}
export const reFill = <T>(arr: T[], values: T[]): void => {
    arr.splice(0, arr.length, ...values)
}

export default {
    isArray,
    isIterable,
    toArray,
    newArray,
    orderBy,
    orderByDesc,
    naturalSort,
    shuffle,
    innerJoin,
    groupBy,
    groupJoin,
    count,
    first,
    last,
    distinctBy,
    distinct,
    union,
    take,
    skip,
    page,
    countPages,
    min,
    max,
    sum,
    average,
    toMap,
    sameContent,
    query,
    getEnumerator,
    move,
    reFill,
}
