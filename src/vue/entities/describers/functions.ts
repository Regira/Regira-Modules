import type { IConfig, IEntity } from "../../../core/entities/abstractions"
import { getEntityDescribers } from "../../../core/entities/describers/functions"
import type { IPoolHandler } from "../pooling"

type EntityDescriber = {
    config: IConfig
    store: () => IPoolHandler<IEntity>
    components: Record<string, unknown>
}

/** The core's registry; its stores are this layer's pool handlers, whose boxes are refs. */
export function useEntityDescribers(ns?: Symbol): {
    describers: Map<string, EntityDescriber>
    readonly types: string[]
    addType: <T extends IEntity = IEntity>(config: IConfig, store: () => IPoolHandler<T>, components: Record<string, unknown>) => void
    getDesc: (entityKey: string) => EntityDescriber | undefined
} {
    return getEntityDescribers(ns) as unknown as ReturnType<typeof useEntityDescribers>
}
