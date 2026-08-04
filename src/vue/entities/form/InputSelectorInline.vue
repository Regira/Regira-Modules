<template>
    <div class="input-selector-inline row align-items-center">
        <template v-for="row in model ?? []" :key="keyOf(row)">
            <div class="col-auto mb-2 pe-0">
                <div class="form-control p-0 d-inline-flex align-items-center" :class="{ 'is-deleted': row._deleted }">
                    <slot name="chip" v-bind="{ row }" />
                    <IconButton
                        icon="delete"
                        class="btn-outline-danger border-0"
                        :title="row._deleted ? 'restore' : 'remove'"
                        @click="toggleRemove(row)"
                    />
                </div>
            </div>
        </template>
        <div class="col-auto mb-2">
            <slot name="selector" v-bind="{ add, exclude }" />
        </div>
    </div>
</template>

<script setup lang="ts" generic="T extends { _deleted?: boolean; id?: number | string | null }">
import { computed, toRaw } from "vue"
import IconButton from "../../ui/icons/IconButton.vue"
import type { InputSelectorInlineProps, InputSelectorInlineEmits, InputSelectorInlineSlots } from "./inputSelectorInline"

// Inline chip editor for an owned/join collection edited inside the parent's form.
// Removing a persisted row MARKS it (`_deleted`, undoable until save) — pair with an
// `EntityService.prepareItem` override that filters marked rows so the server deletes by omission.
// A row added in this session (via `add`, not yet persisted) has nothing to undo and is removed
// outright — tracked by identity, so the row shape needs no `id` field; pass `isNew` to override.
const model = defineModel<Array<T>>()
const props = defineProps<InputSelectorInlineProps<T>>()
const emit = defineEmits<InputSelectorInlineEmits<T>>()
defineSlots<InputSelectorInlineSlots<T>>()

// every current row, marked ones included — a marked row is restored by toggling, not re-picking
const exclude = computed(() => (model.value ?? []).map((x) => props.excludeKey?.(x)).filter((x): x is number => x != null))

// without rowKey, fall back to a stable per-row identity — NOT the index: rows can now be spliced
// mid-list, and index keys would patch a later chip's subtree (open modal, form state) onto the wrong row.
// The fallback lives in its own string namespace: a partial rowKey (e.g. `r => r.id` with unsaved rows)
// mixes caller keys and fallbacks in one v-for, and a bare ++seq integer could collide with a caller's id.
let keySeq = 0
const fallbackKeys = new WeakMap<object, string>()
function keyOf(row: T) {
    const explicit = props.rowKey?.(row)
    if (explicit != null) return explicit
    const raw = toRaw(row)
    if (!fallbackKeys.has(raw)) fallbackKeys.set(raw, `rg-isi-${++keySeq}`)
    return fallbackKeys.get(raw)!
}

// track by RAW identity: a deep-reactive parent re-wraps rows in proxies, so the row read back out of
// model.value is not (reference-wise) the object handed to add() — toRaw normalizes both sides
const addedRows = new WeakSet<object>()
function hasPersistedId(row: T) {
    // only a positive numeric id proves persistence; a string id may be client-minted (GUID for an
    // offline row), so session tracking decides for those
    return typeof row.id === "number" && row.id > 0
}
function isNewRow(row: T) {
    return props.isNew ? props.isNew(row) : addedRows.has(toRaw(row)) && !hasPersistedId(row)
}
function toggleRemove(row: T) {
    if (isNewRow(row)) {
        model.value = (model.value ?? []).filter((x) => toRaw(x) !== toRaw(row))
    } else {
        row._deleted = !row._deleted
    }
    emit("remove", row)
}
function add(row: T) {
    addedRows.add(toRaw(row))
    model.value = [...(model.value ?? []), row]
    emit("add", row)
}
</script>
