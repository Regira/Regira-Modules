import { SearchObjectBase, ArchivedFilter } from "@regira/modules/vue/entities"

export class EntitySearchObject extends SearchObjectBase {
    // `q` (free-text) is inherited from SearchObjectBase. Add your filters:
    title?: string // TODO: your filter fields — placeholder; rename/remove it here AND in FilterAdv.vue
    // barId?: number                     // an FK filter bound to an <InputSelector> must be a SCALAR — the
    //                                    // control speaks one id (`idValue?: number | string`), so widening it
    //                                    // to an array is 9 TS2322s in FilterAdv.vue
    // tagId?: number | Array<number>     // arrays serialize as repeated query keys — for filters you populate
    //                                    // from code or a multi-select, not from an InputSelector. The API
    //                                    // accepts both (its ICollection<TKey> binds one value or many), so
    //                                    // widening later is a UI-only change

    minCreated?: Date // `Date` is fine here — the query-string builder emits ISO-8601 with the local offset
    maxCreated?: Date
    archived?: ArchivedFilter // `only` = recycle bin, `included` = live + archived; leave unset to hide archived rows
}

export default EntitySearchObject
