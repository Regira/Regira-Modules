import { EntityBase } from "@regira/modules/vue/entities"

// The file itself; `_file` is the raw Blob, staged in memory until the parent is saved.
export class Attachment extends EntityBase {
    id = 0
    fileName?: string
    contentType?: string
    length?: number
    _file?: Blob & { name?: string }

    override get $id() {
        return this.id || "new"
    }
    override get $title() {
        return this.fileName
    }

    static create(v?: object) {
        return Object.assign(new Attachment(), v || {})
    }
}

export const Entity = Attachment
export default Attachment
