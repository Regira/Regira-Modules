import type { Entity as __Target__ } from "__targetAlias__"

// A join row linking __Parent__ to __Target__ (back-end `e.Related(x => x.__Children__)`). Rows are picked
// inside the parent form and persisted with the parent's single `save()`; removal is a `_deleted` mark.
//
// Deliberately an interface, not an EntityBase class: InputSelectorInline constrains rows to
// `{ _deleted?: boolean; id?: number | string | null }` and nothing more, and Related() inserts rows that
// arrive without an id — so a row minted by `add(...)` needs no id, no $id and no $title. Giving a pure join
// the full model class instead is what makes `add({ __target__Id, __target__ })` fail to type-check.
//
// If this row grows scalar fields of its own (a quantity, a status, a note), it is no longer a pure join:
// re-scaffold it without --picker to get the editable-table slice instead.
export interface __Child__ {
    id?: number
    __target__Id: number
    __target__?: __Target__ // eager-loaded by the API for the chip label
    _deleted?: boolean // marked-for-removal — the parent's EntityService.prepareItem drops these before save
}

export type Entity = __Child__
