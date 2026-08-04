import type { IConfig, IEntity } from "../abstractions"
import type { IPoolHandler } from "../pooling"

type EntityDescriber = {
    config: IConfig
    store: () => IPoolHandler<IEntity>
    components: Record<string, unknown>
}

const entityDescribers = new Map<Symbol, Map<string, EntityDescriber>>()
const defaultNs = Symbol()

export function useEntityDescribers(ns: Symbol = defaultNs) {
    const desc = entityDescribers.has(ns) ? entityDescribers.get(ns)! : entityDescribers.set(ns, new Map<string, EntityDescriber>()).get(ns)!

    function addEntity<T extends IEntity = IEntity>(config: IConfig, store: () => IPoolHandler<T>, components: Record<string, unknown>) {
        desc.set(config.key, { config, store, components })
    }
    function getDescriber(entityKey: string) {
        return desc.get(entityKey)
    }

    return {
        describers: desc,
        get types() {
            return [...desc.keys()]
        },
        addType: addEntity,
        getDesc: getDescriber,
    }
}
