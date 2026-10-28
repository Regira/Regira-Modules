import type { IEntity } from "../../../core/entities/abstractions/IEntity"
import type { IEntityService } from "../../../core/entities/abstractions/IEntityService"
import { usePooling } from "."

export function createStore<T extends IEntity>(service: IEntityService<T>, type: string) {
    return usePooling<T>(service, type)
}

export default createStore
