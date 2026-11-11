import type { Box, BoxFactory } from "../../box"
import { orderByDesc } from "../../../utilities/array-utility"
import { EntityBase, type IEntity } from "../abstractions"

const DEFAULTS = {
    INTERVAL: 60,
    EXPIRES: 10 * 60,
    MAX_ITEMS: 1000,
}

export interface IPoolCache {
    persistentTypes: Array<string>

    set<T extends IEntity>(item: T): Box<T>
    get<T extends IEntity>(type: string, key: number | string): Box<T> | undefined
    remove<T extends IEntity>(item: T): boolean
    /** drops every cached row, persistent types included — the pool is per tab, not per user */
    clear?(): void

    hasType(type: string): boolean
    getAll<T extends IEntity>(type: string): Array<Box<T>>
    getEntityMap(type: string): Map<number | string, any>
}

type ValueItem = IEntity & { constructor: { name: string } }
interface ICachedBox extends Box<unknown> {
    timestamp: number
}

export type PoolCacheOptions = {
    interval?: number
    expires?: number
    maxItems?: number
}

// each cache's box factory, under a symbol so it adds no member a layer's subclass would inherit. Not a WeakMap keyed
// on the instance: a framework store (pinia) hands out the cache as a proxy, and a proxy is not the key
const boxFactory = Symbol("boxFactory")

/** One box per entity, shared by every view that shows it; a framework layer passes its own box factory. */
export class PoolCache implements IPoolCache {
    _cache = new Map<string, Map<number | string, Box<ValueItem>>>()
    _expires: number
    _maxItems: number
    persistentTypes: Array<string> = []

    constructor({
        box,
        interval = DEFAULTS.INTERVAL,
        expires = DEFAULTS.EXPIRES,
        maxItems = DEFAULTS.MAX_ITEMS,
    }: PoolCacheOptions & { box: BoxFactory }) {
        Object.defineProperty(this, boxFactory, { value: box })
        if (interval > 0) {
            setInterval(() => this.cleanup(), interval * 1000)
        }
        this._expires = expires
        this._maxItems = maxItems
    }

    set<T extends ValueItem>(item: T): Box<T> {
        const map = this.getEntityMap(item.constructor.name)
        let itemBox = this.get(item.constructor.name, item.$id) as Box<T>
        if (itemBox == null) {
            itemBox = (this as unknown as Record<symbol, BoxFactory>)[boxFactory]<T>(item)
        } else {
            itemBox.value = item
        }
        ;(itemBox as ICachedBox).timestamp = +new Date()
        map.set(item.$id, itemBox)
        return itemBox
    }
    get<T extends ValueItem>(type: string, key: number | string): Box<T> | undefined {
        const map = this.getEntityMap(type)
        const itemBox = map.get(key) as Box<T>
        return itemBox
    }
    remove<T extends ValueItem>(item: T): boolean {
        const map = this.getEntityMap(item.constructor.name)
        const isRemoved = map.delete(item.$id)
        return isRemoved
    }

    clear(): void {
        this._cache.clear()
    }

    hasType(type: string): boolean {
        return this._cache.has(type)
    }
    getAll<T extends IEntity>(type?: string): Array<Box<T>> {
        if (type != null) {
            const entityMap = this.getEntityMap(type)
            return [...entityMap].map(([, item]) => item as Box<T>)
        }
        return [...this._cache].flatMap(([, map]) => [...map].map(([, item]) => item as Box<T>))
    }
    findReferences<T extends ValueItem>(input: T): Array<Box<ValueItem>> {
        const allBoxes = this.getAll()
        const items = allBoxes.filter((itemBox) => {
            function hasReference(value: Array<IEntity> | IEntity): boolean {
                if (Array.isArray(value)) {
                    return value.some((v) => hasReference(v))
                }
                if (value instanceof EntityBase) {
                    if (value?.constructor?.name === input.constructor.name) {
                        return (value as IEntity).$id === input.$id
                    }

                    const references = Object.entries(value)
                        .map(([, v]) => v)
                        .filter((v) => v instanceof EntityBase || (Array.isArray(v) && v.some((x) => x instanceof EntityBase)))

                    return hasReference(references)
                }
                return false
            }
            return hasReference(itemBox.value as IEntity)
        })
        return items as Array<Box<ValueItem>>
    }

    getEntityMap(type: string): Map<number | string, Box<ValueItem>> {
        if (!this._cache.has(type)) {
            this._cache.set(type, new Map<number | string, Box<ValueItem>>())
        }
        return this._cache.get(type)!
    }

    cleanup() {
        if (this._expires > 0) {
            const expires = +new Date() - this._expires * 1000
            for (let [type, map] of this._cache) {
                if (!this.persistentTypes.includes(type)) {
                    for (let [key, value] of map) {
                        if ((value as ICachedBox).timestamp < expires) {
                            console.debug("removing", type, key)
                            map.delete(key)
                        }
                    }
                }
            }
        }

        const allItems = orderByDesc(
            [...this._cache].flatMap(([, map]) => [...map].map(([, v]) => v)),
            (itemBox) => (itemBox as ICachedBox).timestamp
        )
        if (allItems.length > this._maxItems) {
            const itemsToRemove = allItems.slice(this._maxItems)
            itemsToRemove.forEach((itemBox) => {
                const type = itemBox.value.constructor.name
                // don't remove persistent Entity types
                if (!this.persistentTypes.includes(type)) {
                    const map = this.getEntityMap(type)
                    console.debug("removing", type, itemBox.value.$id)
                    map.delete(itemBox.value.$id)
                }
            })
        }
    }
}
