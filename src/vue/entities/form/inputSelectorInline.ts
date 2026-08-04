/** the collection itself binds via v-model (defineModel<Array<T>>) */
export type InputSelectorInlineProps<T> = {
    /** stable key per row; falls back to an internal per-row identity (never the index — rows can be spliced mid-list) */
    rowKey?: (row: T) => string | number | undefined
    /** related-entity id per row — feeds the `exclude` list handed to the #selector slot */
    excludeKey?: (row: T) => number | undefined
    /**
     * marks a row as not-yet-persisted (removed outright instead of `_deleted`-marked);
     * defaults to "added via this component's `add` in this session and no persisted id"
     */
    isNew?: (row: T) => boolean
}
export type InputSelectorInlineEmits<T> = {
    /**
     * fires on every delete-button click — three outcomes, discriminated by the row's state AFTER the
     * event: hard-removed (unsaved row — no longer in modelValue), marked (`row._deleted === true`),
     * or restored (`row._deleted === false`, still in modelValue)
     */
    (e: "remove", row: T): void
    (e: "add", row: T): void
}
export type InputSelectorInlineSlots<T> = {
    /** renders one selected row (chip content, next to the remove/restore toggle) */
    chip?(props: { row: T }): any
    /** renders the picker; call `add` with the new row, `exclude` lists already-selected ids */
    selector?(props: { add: (row: T) => void; exclude: Array<number> }): any
}
