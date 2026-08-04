import { ref, type Ref } from "vue"
import { orderByDesc } from "../../../utilities/array-utility"
import { EntityBase, type IEntity } from "../abstractions"

const DEFAULTS = {
    INTERVAL: 60,
    EXPIRES: 10 * 60,
    MAX_ITEMS: 1000,
}

export interface IPoolCache {
    persistentTypes: Array<string>

    set<T extends IEntity>(item: T): Ref<T>
    get<T extends IEntity>(type: string, key: number | string): Ref<T> | undefined
    remove<T extends IEntity>(item: T): boolean

    hasType(type: string): boolean
    getAll<T extends IEntity>(type: string): Array<Ref<T>>
    getEntityMap(type: string): Map<number | string, any>
}

type ValueItem = IEntity & { constructor: { name: string } }
interface ICachedRef extends Ref {
    timestamp: number
}

type ICacheOptions = {
    interval?: number
    expires?: number
    maxItems?: number
}

export class PoolCache implements IPoolCache {
    _cache = new Map<string, Map<number | string, Ref<ValueItem>>>()
    _expires: number
    _maxItems: number
    persistentTypes: Array<string> = []

    constructor({ interval = DEFAULTS.INTERVAL, expires = DEFAULTS.EXPIRES, maxItems = DEFAULTS.MAX_ITEMS }: ICacheOptions = {}) {
        if (interval > 0) {
            setInterval(() => this.cleanup(), interval * 1000)
        }
        this._expires = expires
        this._maxItems = maxItems
    }

    set<T extends ValueItem>(item: T): Ref<T> {
        const map = this.getEntityMap(item.constructor.name)
        let itemRef = this.get(item.constructor.name, item.$id) as Ref<T>
        if (itemRef == null) {
            itemRef = ref<T>(item) as Ref<T>
        } else {
            itemRef.value = item
        }
        ;(itemRef as ICachedRef).timestamp = +new Date()
        map.set(item.$id, itemRef)
        return itemRef
    }
    get<T extends ValueItem>(type: string, key: number | string): Ref<T> | undefined {
        const map = this.getEntityMap(type)
        const itemRef = map.get(key) as Ref<T>
        return itemRef
    }
    remove<T extends ValueItem>(item: T): boolean {
        const map = this.getEntityMap(item.constructor.name)
        const isRemoved = map.delete(item.$id)
        // const references = this.findReferences(item);
        // console.debug("references", { removed: item, references });
        return isRemoved
    }

    hasType(type: string): boolean {
        return this._cache.has(type)
    }
    getAll<T extends IEntity>(type?: string): Array<Ref<T>> {
        if (type != null) {
            const entityMap = this.getEntityMap(type)
            return [...entityMap].map(([, item]) => item as Ref<T>)
        }
        return [...this._cache].flatMap(([, map]) => [...map].map(([, item]) => item as Ref<T>))
    }
    findReferences<T extends ValueItem>(input: T): Array<Ref<ValueItem>> {
        const allRefs = this.getAll()
        const items = allRefs.filter((itemRef) => {
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
            return hasReference(itemRef.value)
        })
        return items
    }

    getEntityMap(type: string): Map<number | string, Ref<ValueItem>> {
        if (!this._cache.has(type)) {
            this._cache.set(type, new Map<number | string, Ref<ValueItem>>())
        }
        return this._cache.get(type)!
    }

    cleanup() {
        if (this._expires > 0) {
            const expires = +new Date() - this._expires * 1000
            for (let [type, map] of this._cache) {
                if (!this.persistentTypes.includes(type)) {
                    for (let [key, value] of map) {
                        if ((value as ICachedRef).timestamp < expires) {
                            console.debug("removing", type, key)
                            map.delete(key)
                        }
                    }
                }
            }
        }

        const allItems = orderByDesc(
            [...this._cache].flatMap(([, map]) => [...map].map(([, v]) => v)),
            (itemRef) => (itemRef as ICachedRef).timestamp
        )
        if (allItems.length > this._maxItems) {
            const itemsToRemove = allItems.slice(this._maxItems)
            itemsToRemove.forEach((itemRef) => {
                const type = itemRef.value.constructor.name
                // don't remove persistent Entity types
                if (!this.persistentTypes.includes(type)) {
                    const map = this.getEntityMap(type)
                    console.debug("removing", type, itemRef.value.$id)
                    map.delete(itemRef.value.$id)
                }
            })
        }
    }
}

export default PoolCache
