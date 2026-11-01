import { type Ref } from "vue"
import { type IEntity } from "../../../core/entities/abstractions"
import { PoolCache as CorePoolCache } from "../../../core/entities/pooling/PoolCache"
import { vueBox } from "../../box"

export interface IPoolCache {
    persistentTypes: Array<string>

    set<T extends IEntity>(item: T): Ref<T>
    get<T extends IEntity>(type: string, key: number | string): Ref<T> | undefined
    remove<T extends IEntity>(item: T): boolean
    /** drops every cached row, persistent types included — the pool is per tab, not per user */
    clear?(): void

    hasType(type: string): boolean
    getAll<T extends IEntity>(type: string): Array<Ref<T>>
    getEntityMap(type: string): Map<number | string, any>
}

type ValueItem = IEntity & { constructor: { name: string } }

type ICacheOptions = {
    interval?: number
    expires?: number
    maxItems?: number
}

/** The core's pool with a ref per entity; the overrides only type the boxes as the refs they are. */
export class PoolCache extends CorePoolCache implements IPoolCache {
    declare _cache: Map<string, Map<number | string, Ref<ValueItem>>>

    constructor(options: ICacheOptions = {}) {
        super({ ...options, box: vueBox })
    }

    set<T extends ValueItem>(item: T): Ref<T> {
        return super.set(item) as Ref<T>
    }
    get<T extends ValueItem>(type: string, key: number | string): Ref<T> | undefined {
        return super.get<T>(type, key) as Ref<T> | undefined
    }
    getAll<T extends IEntity>(type?: string): Array<Ref<T>> {
        return super.getAll<T>(type) as Array<Ref<T>>
    }
    findReferences<T extends ValueItem>(input: T): Array<Ref<ValueItem>> {
        return super.findReferences(input) as Array<Ref<ValueItem>>
    }
    getEntityMap(type: string): Map<number | string, Ref<ValueItem>> {
        return super.getEntityMap(type) as Map<number | string, Ref<ValueItem>>
    }
}

export default PoolCache
