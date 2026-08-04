import type { IEntity } from "../abstractions/IEntity"
import type { IEntityService } from "../abstractions/IEntityService"
import { usePooling } from "."

export function createStore<T extends IEntity>(service: IEntityService<T>, type: string) {
    return usePooling<T>(service, type)
}

export default createStore
