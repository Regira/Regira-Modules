import { EntityBase } from "@regira/modules/vue/entities"
import Attachment from "../attachments/Entity"

// The owned join row on the parent (`parent.attachments`).
export class EntityAttachment extends EntityBase {
    id = 0
    objectId?: number
    attachmentId?: number
    uri?: string
    sortOrder = 0 // list position — mirrored from the array index client-side (keeps re-maps stable); the server derives SortOrder from the array order on save (its input DTO has no sort field, so the serialized value is informational)
    newFileName?: string // edited name for an existing file — applied on flush
    attachment?: Attachment
    _deleted = false // marked-delete (undoable) — filtered out in the host service's prepareItem

    override get $id() {
        return this.id || "new"
    }
    override get $title() {
        return this.fileName
    }
    get fileName() {
        return this.attachment?.fileName
    }
    set fileName(v) {
        ;(this.attachment ??= new Attachment()).fileName = v
    }

    static create(v?: object): EntityAttachment {
        const a = (v as EntityAttachment)?.attachment
        if (a && !(a instanceof Attachment)) (v as EntityAttachment).attachment = Attachment.create(a)
        const item = Object.assign(new EntityAttachment(), v || {})
        if (item.id > 0 && item.fileName && !item.newFileName) item.newFileName = item.fileName
        return item
    }
}

export const Entity = EntityAttachment
export default EntityAttachment
