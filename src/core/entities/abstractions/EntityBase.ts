import type { IEntity } from "./IEntity"
//import { newGuid } from "../../../utilities/string-utility"

export abstract class EntityBase implements IEntity {
    //guid: string
    constructor() {
        //this.guid = newGuid()
    }
    abstract get $id(): string | number
    abstract get $title(): string | undefined
}

Object.defineProperty(EntityBase.prototype, "entityType", {
    get() {
        return this.constructor.name
    },
    configurable: true,
    enumerable: true,
})

export default EntityBase
