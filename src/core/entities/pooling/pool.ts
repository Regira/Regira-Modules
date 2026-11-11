import type { Box } from "../../box"
import { type IEntity, type IEntityService, isNewEntity } from "../abstractions"
import { PoolService, type IPoolService } from "./PoolService"
import type { IPoolCache } from "./PoolCache"

export interface IPoolHandler<T extends IEntity> extends IPoolService<T> {
    service: IPoolService<T>
    cache: IPoolCache
    set(item: T): Box<T>
    setMany(items: Array<T>): Array<Box<T>>
    /**
     * The pooled instance for each input's id — a rehydrated entity with `$id`/`$title`, shared by every view.
     * Read-through, not write-through: for an id already cached it returns the cached instance and discards
     * `input`. `set(item)` / `setMany(items)` are the writes.
     */
    fromPool<P = Array<T> | T>(input: P): P
    fromCache(id?: string | number): Box<T> | undefined | Array<Box<T>>
}

export type PoolHandlerInput<T extends IEntity> = {
    service: IEntityService<T>
    type: string
    cache: IPoolCache
    /** the type's rows survive the cache's cleanup */
    persistent?: boolean
}

export function createPoolHandler<T extends IEntity>({ service, type, cache, persistent = false }: PoolHandlerInput<T>): IPoolHandler<T> {
    const poolService = service instanceof PoolService ? service : new PoolService(service, cache, type)
    if (persistent && !cache.persistentTypes.includes(type)) {
        cache.persistentTypes.push(type)
    }

    function fromPool<P = Array<T> | T>(input: P): P {
        // prevent pooling of empty item
        if (input == null) {
            return input
        }
        if (!Array.isArray(input)) {
            const item = service.toEntity(input as unknown as T)
            if (isNewEntity(item?.$id)) {
                return item as unknown as P
            }
        }
        return (Array.isArray(input) ? poolService.getMany(input || []).map((x) => x.value) : poolService.get(input as unknown as T)?.value) as P
    }

    return {
        service: poolService as IPoolService<T>,
        cache,

        details: poolService.details.bind(poolService),
        list: poolService.list.bind(poolService),
        search: poolService.search.bind(poolService),
        searchUnion: poolService.searchUnion.bind(poolService),
        save: poolService.save.bind(poolService),
        patch: poolService.patch.bind(poolService),
        remove: poolService.remove.bind(poolService),
        toEntity: poolService.toEntity.bind(poolService),
        newEntity: poolService.newEntity.bind(poolService),

        get: (item: T) => poolService.get(item),
        getMany: (items: Array<T>) => poolService.getMany(items),
        set: (item: T) => cache.set<T>(poolService.toEntity(item)),
        setMany: (items: Array<T>) => items.map((item) => cache.set(poolService.toEntity(item))),

        fromPool,
        fromCache: (id?: string | number) => (id ? cache.get<T>(type, id) : cache.getAll<T>(type)),
    }
}
