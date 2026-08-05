import { defineStore } from "pinia"
import { get } from "@regira/modules/vue/ioc"
import { createStore, type IEntityService } from "@regira/modules/vue/entities"
import Entity from "./Entity"

export const useEntityStore = defineStore(Entity.name, () => {
    const service = get<IEntityService<Entity>>(Entity.name)!
    return createStore<Entity>(service, Entity.name) // pooled, reactive shared cache
})
// The store's `service` is the generic IEntityService surface, NOT your EntityService subclass — a custom
// endpoint you added there is not on it (casting the pooled handler is a TS2352). Reach the real one:
//   import { get } from "@regira/modules/vue/ioc"
//   const service = get<EntityService>(Entity.name)!
// Use the pooled store for ordinary CRUD so views share the reactive cache; use the raw service for the rest.

export default useEntityStore
