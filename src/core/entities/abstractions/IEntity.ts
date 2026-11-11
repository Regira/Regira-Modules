export interface IEntity {
    get $id(): number | string
    get $title(): string | undefined
}

/**
 * True when `$id` is an unsaved-entity sentinel: `null`, `undefined`, the literal `"new"`, an empty string,
 * or a **non-positive number** — `0` (the default int key of a fresh model) or a negative temp id. Owned/
 * related collections mint decrementing negatives (`-1`, `-2`, …) to keep new rows unique before they are
 * persisted, so a real key is always a positive int (or a non-empty string). `save()` inserts these and
 * updates everything else, so a model whose `$id` returns a bare `this.id` still inserts correctly at `id <= 0`.
 */
export function isNewEntity(id: number | string | null | undefined): boolean {
    return id == null || id === "new" || id === "" || (typeof id === "number" && id <= 0)
}
