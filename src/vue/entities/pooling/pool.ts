import type { Ref } from "vue"
import type { IEntity, IEntityService } from "../../../core/entities/abstractions"
import { createPoolHandler } from "../../../core/entities/pooling/pool"
import { PoolService as CorePoolService } from "../../../core/entities/pooling/PoolService"
import { PoolService, type IPoolService } from "./PoolService"
import { PoolCache, type IPoolCache } from "./PoolCache"

export interface IPoolHandler<T extends IEntity> extends IPoolService<T> {
    service: IPoolService<T>
    cache: IPoolCache
    set(item: T): Ref<T>
    setMany(items: Array<T>): Array<Ref<T>>
    /**
     * The pooled instance for each input's id — a rehydrated entity with `$id`/`$title`, shared by every view.
     * ⚠️ **Read-through, not write-through.** For an id already cached it returns the cached ref and discards
     * `input`, so it is the wrong call for landing an update: `Object.assign(item, fromPool(updated))` on a
     * form bound to that row is a no-op (`item` already *is* that instance), and passing a fresher object
     * does not refresh the pool either. `set(item)` / `setMany(items)` are the writes — use those after a
     * custom endpoint returns an updated entity.
     */
    fromPool<P = Array<T> | T>(input: P): P
    fromCache(id?: string | number): Ref<T> | undefined | Array<Ref<T>>
}

export const defaultPoolCache = new PoolCache()
export function usePooling<T extends IEntity>(
    service: IEntityService<T>,
    type: string,
    cache: IPoolCache = defaultPoolCache,
    persistent = false
): IPoolHandler<T> {
    // the Vue layer's own pooled service, so its reads are typed as the refs the cache's boxes are
    const pooled = service instanceof CorePoolService ? service : new PoolService(service, cache, type)
    return createPoolHandler({ service: pooled, type, cache, persistent }) as unknown as IPoolHandler<T>
}

export default usePooling
