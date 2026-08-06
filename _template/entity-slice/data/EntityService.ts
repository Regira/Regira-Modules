import type { AxiosInstance } from "axios"
import { EntityServiceBase, type IConfig } from "@regira/modules/vue/entities"
import Entity from "./Entity"

export class EntityService extends EntityServiceBase<Entity> {
    constructor(axios: AxiosInstance, config: IConfig) {
        super(axios, config)
    }

    // Owned child collections use the `_deleted` mark (never splice): removed rows are filtered out here so
    // the server deletes them by omission. Add one filter line per owned collection; `super` strips root `_`-fields.
    // ⚠️ No `|| []` — the back-end contract is null = untouched, [] = delete every row. `?.filter(...)` keeps
    // undefined for a collection this form never loaded, and still yields [] when the user removed the last row.
    protected override prepareItem(item: Entity): Entity {
        // TODO (owned collections only): item.children = item.children?.filter((x) => !x._deleted)
        return super.prepareItem(item)
    }

    // Keep this IDEMPOTENT — it runs inside computeds (fromPool, FormModalButton.modalTitle). Return an
    // existing instance untouched, and guard every conversion you add — dates:
    //   if (typeof (e as any).publishedOn === "string") e.publishedOn = new Date((e as any).publishedOn)
    // and owned-collection lifts, where a fresh array is a mutation just like a fresh Date:
    //   if (e.children?.some((row) => !(row instanceof Child))) e.children = e.children.map((row) => Child.create(row))
    // An unconditional conversion throws "Maximum recursive updates exceeded" against a LIBRARY component.
    override toEntity(item: object): Entity {
        return item instanceof Entity ? item : Object.assign(this.createInstance(Entity as new () => Entity), item || {})
    }
}

export default EntityService
