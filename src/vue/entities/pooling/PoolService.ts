import type { Ref } from "vue"
import type { IEntity, IEntityService } from "../../../core/entities/abstractions"
import { PoolService as CorePoolService } from "../../../core/entities/pooling/PoolService"
import type { IPoolCache } from "./PoolCache"

export interface IPoolService<T extends IEntity> extends IEntityService<T> {
    patch(id: number | string, changes: Record<string, unknown>): Promise<T | undefined>
    get(input: T): Ref<T> | undefined
    getMany(input: Array<T>): Array<Ref<T>>
}

/** The core's pooled service over a Vue pool; the overrides only type the boxes as the refs they are. */
export class PoolService<T extends IEntity> extends CorePoolService<T> implements IPoolService<T> {
    constructor(service: IEntityService<T>, cache: IPoolCache, type: string) {
        super(service, cache, type)
    }

    get(item: T): Ref<T> | undefined {
        return super.get(item) as Ref<T> | undefined
    }
    getMany(items: Array<T>): Array<Ref<T>> {
        return super.getMany(items) as Array<Ref<T>>
    }
    set(item: T): Ref<T> {
        return super.set(item) as Ref<T>
    }
    setMany(items: Array<T>): Array<Ref<T>> {
        return super.setMany(items) as Array<Ref<T>>
    }
}

export default PoolService
